class StationController {
  constructor(db, streamController) {
    this.db = db;
    this.streamController = streamController;
  }

  async startStation(req, res) {
    try {
      const result = await this.streamController.start();
      
      if (result.success) {
        res.json({ success: true, message: 'Station started' });
      } else {
        res.status(400).json({ success: false, error: result.message });
      }
    } catch (err) {
      console.error('Start station error:', err);
      res.status(500).json({ error: 'Failed to start station' });
    }
  }

  async stopStation(req, res) {
    try {
      await this.streamController.stop();
      res.json({ success: true, message: 'Station stopped' });
    } catch (err) {
      console.error('Stop station error:', err);
      res.status(500).json({ error: 'Failed to stop station' });
    }
  }

  async setMode(req, res) {
    try {
      const { mode } = req.body;

      if (!mode || !['playlist', 'live'].includes(mode)) {
        return res.status(400).json({ error: 'Mode must be "playlist" or "live"' });
      }

      const state = this.db.getStationState();
      const wasStreaming = state.is_streaming;

      // Stop current stream if running
      if (wasStreaming) {
        await this.streamController.stop();
      }

      // Update mode
      this.db.updateStationState({ mode });

      // Restart stream if it was running
      if (wasStreaming) {
        await this.streamController.start();
      }

      res.json({ 
        success: true, 
        mode,
        restarted: wasStreaming
      });
    } catch (err) {
      console.error('Set mode error:', err);
      res.status(500).json({ error: 'Failed to set mode' });
    }
  }

  async setLiveInput(req, res) {
    try {
      const { liveInputUrl } = req.body;

      if (!liveInputUrl) {
        return res.status(400).json({ error: 'liveInputUrl is required' });
      }

      // Basic URL validation
      try {
        new URL(liveInputUrl);
      } catch (err) {
        return res.status(400).json({ error: 'Invalid URL format' });
      }

      this.db.updateStationState({ liveInputUrl });

      res.json({ 
        success: true,
        liveInputUrl
      });
    } catch (err) {
      console.error('Set live input error:', err);
      res.status(500).json({ error: 'Failed to set live input URL' });
    }
  }

  async getStatus(req, res) {
    try {
      const status = this.streamController.getStatus();
      const state = this.db.getStationState();

      res.json({
        mode: status.mode,
        isOnline: status.isOnline,
        lastError: status.lastError,
        hlsHealth: status.hlsHealth,
        liveInputUrl: state.live_input_url,
        currentTrack: status.currentTrack
      });
    } catch (err) {
      console.error('Get status error:', err);
      res.status(500).json({ error: 'Failed to get status' });
    }
  }
}

module.exports = StationController;
