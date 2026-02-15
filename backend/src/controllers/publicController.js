class PublicController {
  constructor(db, streamController) {
    this.db = db;
    this.streamController = streamController;
  }

  async getNowPlaying(req, res) {
    try {
      const nowPlaying = this.streamController.getCurrentlyPlaying();
      res.json(nowPlaying);
    } catch (err) {
      console.error('Get now playing error:', err);
      res.status(500).json({ error: 'Failed to fetch now playing' });
    }
  }

  async getRecentlyPlayed(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const recentTracks = this.db.getRecentlyPlayed(limit);

      const formatted = recentTracks.map(track => ({
        id: track.track_id,
        title: track.title,
        artist: track.artist,
        durationSec: track.duration_sec,
        playedAt: track.played_at
      }));

      res.json({ tracks: formatted });
    } catch (err) {
      console.error('Get recently played error:', err);
      res.status(500).json({ error: 'Failed to fetch recently played' });
    }
  }

  async getUpcoming(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      
      // Get current playlist and position from streamController
      const playlistTracks = this.streamController.playlistTracks || [];
      const currentIndex = this.streamController.currentTrackIndex || 0;
      
      if (playlistTracks.length === 0) {
        return res.json({ tracks: [] });
      }

      // Get next tracks starting from current position
      const upcomingTracks = [];
      for (let i = 0; i < limit; i++) {
        const index = (currentIndex + i) % playlistTracks.length;
        const track = playlistTracks[index];
        if (track) {
          upcomingTracks.push({
            id: track.track_id || track.id,
            title: track.title || track.filename,
            artist: track.artist || 'Unknown Artist',
            durationSec: track.duration_sec || 0,
            position: i,
            isCurrent: i === 0
          });
        }
      }

      res.json({ tracks: upcomingTracks });
    } catch (err) {
      console.error('Get upcoming error:', err);
      res.status(500).json({ error: 'Failed to fetch upcoming tracks' });
    }
  }
}

module.exports = PublicController;
