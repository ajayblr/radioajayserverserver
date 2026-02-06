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

    this.currentTrackIndex = 0;
    this.db.updateStationState({ isStreaming: true, lastError: null, mode: 'playlist' });

    this.playNextTrack();
    
    console.log('✓ Playlist mode started');
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
      '-re', // Read input at native frame rate
      '-i', inputPath,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-f', 'hls',
      '-hls_time', this.config.HLS_SEGMENT_DURATION.toString(),
      '-hls_list_size', this.config.HLS_PLAYLIST_SIZE.toString(),
      '-hls_flags', 'delete_segments+append_list',
      '-hls_segment_filename', path.join(this.config.HLS_DIR, 'segment_%03d.ts'),
      hlsPath
    ];

    this.ffmpegProcess = spawn('ffmpeg', args);

    this.ffmpegProcess.stdout.on('data', (data) => {
      // console.log(`FFmpeg: ${data}`);
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
      console.error('Failed to start FFmpeg:', err);
      this.db.updateStationState({ 
        isStreaming: false, 
        lastError: `FFmpeg error: ${err.message}` 
      });
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
      '-hls_time', this.config.HLS_SEGMENT_DURATION.toString(),
      '-hls_list_size', this.config.HLS_PLAYLIST_SIZE.toString(),
      '-hls_flags', 'delete_segments+append_list',
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
