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
}

module.exports = PublicController;
