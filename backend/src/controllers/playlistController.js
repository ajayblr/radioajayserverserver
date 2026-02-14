class PlaylistController {
  constructor(db) {
    this.db = db;
  }

  async getPlaylist(req, res) {
    try {
      const playlist = this.db.getPlaylist();
      
      const formatted = {
        shuffleEnabled: playlist.shuffleEnabled,
        startFromIndex: playlist.startFromIndex || 0,
        tracks: playlist.tracks.map(track => ({
          id: track.track_id,
          position: track.position,
          title: track.title,
          artist: track.artist,
          durationSec: track.duration_sec,
          filename: track.filename
        }))
      };

      res.json(formatted);
    } catch (err) {
      console.error('Get playlist error:', err);
      res.status(500).json({ error: 'Failed to fetch playlist' });
    }
  }

  async updatePlaylist(req, res) {
    try {
      const { trackIds, shuffleEnabled, startFromIndex } = req.body;

      if (!Array.isArray(trackIds)) {
        return res.status(400).json({ error: 'trackIds must be an array' });
      }

      // Validate all track IDs exist
      const allTracks = this.db.getAllTracks();
      const validIds = new Set(allTracks.map(t => t.id));
      
      const invalidIds = trackIds.filter(id => !validIds.has(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ 
          error: 'Invalid track IDs', 
          invalidIds 
        });
      }

      // Remove duplicates while preserving order
      const uniqueTrackIds = [...new Set(trackIds)];
      const startIndex = startFromIndex !== undefined ? parseInt(startFromIndex) : 0;

      this.db.updatePlaylist(uniqueTrackIds, Boolean(shuffleEnabled), startIndex);

      // Store startFromIndex in streamController
      if (startIndex >= 0) {
        this.streamController.startFromIndex = startIndex;
      }

      res.json({ 
        success: true,
        trackCount: uniqueTrackIds.length,
        shuffleEnabled: Boolean(shuffleEnabled),
        startFromIndex: startIndex
      });
    } catch (err) {
      console.error('Update playlist error:', err);
      res.status(500).json({ error: 'Failed to update playlist' });
    }
  }
}

module.exports = PlaylistController;
