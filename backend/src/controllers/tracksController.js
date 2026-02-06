const { parseFile } = require('music-metadata');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

class TracksController {
  constructor(db, config) {
    this.db = db;
    this.config = config;
  }

  async uploadTracks(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const uploadedTracks = [];

      for (const file of req.files) {
        const trackId = uuidv4();
        const filename = file.originalname;
        const filePath = file.path;

        // Extract metadata
        let metadata = {
          title: path.parse(filename).name,
          artist: 'Unknown Artist',
          durationSec: 0
        };

        try {
          const audioMetadata = await parseFile(filePath);
          metadata = {
            title: audioMetadata.common.title || metadata.title,
            artist: audioMetadata.common.artist || metadata.artist,
            durationSec: Math.round(audioMetadata.format.duration || 0)
          };
        } catch (err) {
          console.warn(`Could not extract metadata from ${filename}:`, err.message);
        }

        // Save to database
        this.db.addTrack({
          id: trackId,
          filename: filename,
          path: filePath,
          title: metadata.title,
          artist: metadata.artist,
          durationSec: metadata.durationSec
        });

        uploadedTracks.push({
          id: trackId,
          filename,
          title: metadata.title,
          artist: metadata.artist,
          durationSec: metadata.durationSec
        });
      }

      res.json({ 
        success: true, 
        tracks: uploadedTracks,
        count: uploadedTracks.length
      });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  }

  async getAllTracks(req, res) {
    try {
      const tracks = this.db.getAllTracks();
      
      const formatted = tracks.map(track => ({
        id: track.id,
        filename: track.filename,
        title: track.title,
        artist: track.artist,
        durationSec: track.duration_sec,
        uploadedAt: track.uploaded_at
      }));

      res.json({ tracks: formatted });
    } catch (err) {
      console.error('Get tracks error:', err);
      res.status(500).json({ error: 'Failed to fetch tracks' });
    }
  }

  async deleteTrack(req, res) {
    try {
      const { id } = req.params;
      
      const track = this.db.getTrackById(id);
      if (!track) {
        return res.status(404).json({ error: 'Track not found' });
      }

      // Delete file from disk
      if (fs.existsSync(track.path)) {
        fs.unlinkSync(track.path);
      }

      // Delete from database
      this.db.deleteTrack(id);

      res.json({ success: true });
    } catch (err) {
      console.error('Delete track error:', err);
      res.status(500).json({ error: 'Failed to delete track' });
    }
  }
}

module.exports = TracksController;
