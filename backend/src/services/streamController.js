const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class StreamController {
  constructor(db, config) {
    this.db = db;
    this.config = config;
    this.ffmpegProcess = null;
    this.currentTrackIndex = 0;
    this.playlistTracks = [];
    this.currentTrack = null;
    this.trackStartTime = null;
    this.isShuffled = false;
  }

  async start() {
    const state = this.db.getStationState();
    
    if (state.is_streaming) {
      console.log('Stream already running');
      return { success: false, message: 'Stream already running' };
    }

    // Clean HLS directory
    this.cleanHLSDirectory();

    if (state.mode === 'playlist') {
      return this.startPlaylistMode();
    } else if (state.mode === 'live') {
      return this.startLiveMode();
    }
  }

  async stop() {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGTERM');
      this.ffmpegProcess = null;
    }

    this.db.updateStationState({ isStreaming: false });
    this.currentTrack = null;
    this.trackStartTime = null;

    console.log('✓ Stream stopped');
    return { success: true };
  }

  async startPlaylistMode() {
    const playlist = this.db.getPlaylist();
    
    if (!playlist.tracks || playlist.tracks.length === 0) {
      this.db.updateStationState({ 
        isStreaming: false, 
        lastError: 'Playlist is empty' 
      });
      return { success: false, message: 'Playlist is empty' };
    }

    this.playlistTracks = [...playlist.tracks];
    this.isShuffled = playlist.shuffleEnabled;

    if (this.isShuffled) {
      this.shuffleArray(this.playlistTracks);
    }

    // Use startFromIndex from database or from memory, default to 0
    const startIndex = playlist.startFromIndex !== undefined ? playlist.startFromIndex : (this.startFromIndex || 0);
    this.currentTrackIndex = startIndex;
    
    // Validate index is within bounds
    if (this.currentTrackIndex >= this.playlistTracks.length) {
      this.currentTrackIndex = 0;
    }
    
    this.db.updateStationState({ isStreaming: true, lastError: null, mode: 'playlist' });

    this.playNextTrack();
    
    console.log(`✓ Playlist mode started from track #${this.currentTrackIndex + 1}`);
    return { success: true };
  }

  playNextTrack() {
    if (!this.playlistTracks || this.playlistTracks.length === 0) {
      console.log('No tracks in playlist');
      return;
    }

    // Loop back to start
    if (this.currentTrackIndex >= this.playlistTracks.length) {
      this.currentTrackIndex = 0;
      
      // Re-shuffle if enabled
      if (this.isShuffled) {
        this.shuffleArray(this.playlistTracks);
      }
    }

    const track = this.playlistTracks[this.currentTrackIndex];
    this.currentTrack = track;
    this.trackStartTime = new Date().toISOString();

    // Add to recently played
    this.db.addRecentlyPlayed(track.track_id);

    console.log(`Playing: ${track.title || track.filename} (${this.currentTrackIndex + 1}/${this.playlistTracks.length})`);

    this.startFFmpeg(track.path, track.duration_sec);
  }

  startFFmpeg(inputPath, durationSec) {
    const hlsPath = path.join(this.config.HLS_DIR, 'radioajay.m3u8');
    
    const args = [
      '-loglevel', 'error', // Only show errors
      '-re', // Read input at native frame rate
      '-i', inputPath,
      '-vn', // No video
      '-c:a', 'aac',
      '-b:a', '96k', // REDUCED from 128k to 96k for lower CPU
      '-ar', '44100',
      '-ac', '2', // Stereo
      '-threads', '1', // LIMIT to 1 thread to reduce CPU spikes
      '-err_detect', 'ignore_err', // Ignore minor errors
      '-f', 'hls',
      '-hls_time', '10', // INCREASED from 6 to 10 - longer segments = less CPU
      '-hls_list_size', '6', // REDUCED from 10 to 6 - less memory
      '-hls_flags', 'delete_segments+append_list+omit_endlist',
      '-hls_segment_filename', path.join(this.config.HLS_DIR, 'segment_%03d.ts'),
      hlsPath
    ];

    this.ffmpegProcess = spawn('ffmpeg', args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    this.ffmpegProcess.stdout.on('data', (data) => {
      // Suppress output to reduce overhead
    });

    this.ffmpegProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Error') || output.includes('error')) {
        console.error('FFmpeg error:', output);
      }
    });

    this.ffmpegProcess.on('close', (code) => {
      console.log(`FFmpeg process exited with code ${code}`);
      
      const state = this.db.getStationState();
      
      // AUTO-RECOVERY: If unexpected exit and still supposed to be streaming, restart
      if (code !== 0 && state.is_streaming) {
        console.log('⚠️ FFmpeg crashed unexpectedly. Auto-recovering in 2 seconds...');
        setTimeout(() => {
          if (state.mode === 'live') {
            console.log('🔄 Attempting to restart live stream...');
            this.startLiveMode();
          } else {
            console.log('🔄 Attempting to continue playlist...');
            this.playNextTrack();
          }
        }, 2000);
        return;
      }
      
      if (code !== 0 && state.mode === 'live') {
        console.log('Live stream failed, falling back to playlist mode');
        this.db.updateStationState({ 
          mode: 'playlist', 
          lastError: 'Live input failed, switched to playlist mode' 
        });
        this.startPlaylistMode();
        return;
      }

      if (state.is_streaming && state.mode === 'playlist') {
        this.currentTrackIndex++;
        this.playNextTrack();
      }
    });

    this.ffmpegProcess.on('error', (err) => {
      console.error('❌ Failed to start FFmpeg:', err);
      this.db.updateStationState({ 
        isStreaming: false, 
        lastError: `FFmpeg error: ${err.message}` 
      });
      
      // AUTO-RECOVERY: Try to restart after error
      console.log('🔄 Auto-recovery: Restarting stream in 5 seconds...');
      setTimeout(() => {
        this.start();
      }, 5000);
    });
  }

  async startLiveMode() {
    const state = this.db.getStationState();
    
    if (!state.live_input_url) {
      this.db.updateStationState({ 
        isStreaming: false, 
        lastError: 'No live input URL configured' 
      });
      return { success: false, message: 'No live input URL configured' };
    }

    this.currentTrack = {
      id: 'live',
      title: 'Live Broadcast',
      artist: 'RadioAjay',
      duration_sec: 0
    };
    this.trackStartTime = new Date().toISOString();

    const hlsPath = path.join(this.config.HLS_DIR, 'radioajay.m3u8');
    
    const args = [
      '-i', state.live_input_url,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-f', 'hls',
      '-hls_time', '6',
      '-hls_list_size', '10',
      '-hls_flags', 'delete_segments+append_list+omit_endlist',
      '-hls_segment_filename', path.join(this.config.HLS_DIR, 'segment_%03d.ts'),
      hlsPath
    ];

    this.ffmpegProcess = spawn('ffmpeg', args);

    this.ffmpegProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Error') || output.includes('error')) {
        console.error('FFmpeg error:', output);
      }
    });

    this.ffmpegProcess.on('close', (code) => {
      console.log(`Live FFmpeg process exited with code ${code}`);
      
      if (code !== 0) {
        console.log('Live stream failed, falling back to playlist mode');
        this.db.updateStationState({ 
          mode: 'playlist', 
          lastError: 'Live input failed, switched to playlist mode' 
        });
        this.startPlaylistMode();
      }
    });

    this.ffmpegProcess.on('error', (err) => {
      console.error('Failed to start live FFmpeg:', err);
      this.db.updateStationState({ 
        isStreaming: false, 
        lastError: `Live input error: ${err.message}` 
      });
      
      // Fallback to playlist
      setTimeout(() => {
        this.db.updateStationState({ mode: 'playlist' });
        this.startPlaylistMode();
      }, 1000);
    });

    this.db.updateStationState({ isStreaming: true, lastError: null, mode: 'live' });
    console.log('✓ Live mode started');
    return { success: true };
  }

  getCurrentlyPlaying() {
    const state = this.db.getStationState();
    
    // If in live mode and has a live broadcast title, use that
    if (state.mode === 'live' && state.live_broadcast_title) {
      return {
        station: 'RadioAjay',
        mode: state.mode,
        isOnline: Boolean(state.is_streaming),
        track: {
          id: 'live',
          title: state.live_broadcast_title,
          artist: 'Live Broadcast',
          durationSec: 0
        },
        startedAt: this.trackStartTime
      };
    }
    
    // Otherwise return current track (playlist mode or live without title)
    return {
      station: 'RadioAjay',
      mode: state.mode,
      isOnline: Boolean(state.is_streaming),
      track: this.currentTrack ? {
        id: this.currentTrack.track_id || this.currentTrack.id,
        title: this.currentTrack.title || this.currentTrack.filename,
        artist: this.currentTrack.artist || 'Unknown Artist',
        durationSec: this.currentTrack.duration_sec || 0
      } : null,
      startedAt: this.trackStartTime
    };
  }

  cleanHLSDirectory() {
    try {
      const files = fs.readdirSync(this.config.HLS_DIR);
      files.forEach(file => {
        if (file.endsWith('.ts') || file.endsWith('.m3u8')) {
          fs.unlinkSync(path.join(this.config.HLS_DIR, file));
        }
      });
      console.log('✓ HLS directory cleaned');
    } catch (err) {
      console.error('Error cleaning HLS directory:', err);
    }
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  getStatus() {
    const state = this.db.getStationState();
    const hlsExists = fs.existsSync(path.join(this.config.HLS_DIR, 'radioajay.m3u8'));
    
    return {
      mode: state.mode,
      isOnline: Boolean(state.is_streaming),
      lastError: state.last_error,
      hlsHealth: hlsExists && state.is_streaming ? 'healthy' : 'unavailable',
      currentTrack: this.currentTrack
    };
  }
}

module.exports = StreamController;
