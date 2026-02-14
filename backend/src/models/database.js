const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseService {
  constructor(dbPath) {
    // Ensure database directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Better performance
    this.initialize();
  }

  initialize() {
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        title TEXT,
        artist TEXT,
        duration_sec INTEGER,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS playlist (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        shuffle_enabled INTEGER DEFAULT 0,
        start_from_index INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS playlist_items (
        playlist_id INTEGER DEFAULT 1,
        track_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        PRIMARY KEY (playlist_id, track_id),
        FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS station_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        mode TEXT DEFAULT 'playlist' CHECK (mode IN ('playlist', 'live')),
        live_input_url TEXT,
        live_broadcast_title TEXT,
        is_streaming INTEGER DEFAULT 0,
        last_error TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS recently_played (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        track_id TEXT NOT NULL,
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_recently_played_date ON recently_played(played_at DESC);
      CREATE INDEX IF NOT EXISTS idx_playlist_items_position ON playlist_items(playlist_id, position);
    `);

    // Initialize default playlist and station_state if they don't exist
    const playlist = this.db.prepare('SELECT * FROM playlist WHERE id = 1').get();
    if (!playlist) {
      this.db.prepare('INSERT INTO playlist (id, shuffle_enabled, start_from_index) VALUES (1, 0, 0)').run();
    }

    // Migration: Add start_from_index column if it doesn't exist
    try {
      const tableInfo = this.db.prepare('PRAGMA table_info(playlist)').all();
      const hasStartFromIndex = tableInfo.some(col => col.name === 'start_from_index');
      if (!hasStartFromIndex) {
        this.db.prepare('ALTER TABLE playlist ADD COLUMN start_from_index INTEGER DEFAULT 0').run();
        console.log('✓ Added start_from_index column to playlist table');
      }
    } catch (err) {
      console.log('Migration check:', err.message);
    }

    // Migration: Add live_broadcast_title column if it doesn't exist
    try {
      const stationInfo = this.db.prepare('PRAGMA table_info(station_state)').all();
      const hasLiveBroadcastTitle = stationInfo.some(col => col.name === 'live_broadcast_title');
      if (!hasLiveBroadcastTitle) {
        this.db.prepare('ALTER TABLE station_state ADD COLUMN live_broadcast_title TEXT').run();
        console.log('✓ Added live_broadcast_title column to station_state table');
      }
    } catch (err) {
      console.log('Migration check:', err.message);
    }

    const stationState = this.db.prepare('SELECT * FROM station_state WHERE id = 1').get();
    if (!stationState) {
      this.db.prepare('INSERT INTO station_state (id, mode, is_streaming) VALUES (1, ?, 0)').run('playlist');
    }

    console.log('✓ Database initialized');
  }

  // Track operations
  addTrack(track) {
    return this.db.prepare(`
      INSERT INTO tracks (id, filename, path, title, artist, duration_sec)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(track.id, track.filename, track.path, track.title, track.artist, track.durationSec);
  }

  getAllTracks() {
    return this.db.prepare('SELECT * FROM tracks ORDER BY uploaded_at DESC').all();
  }

  getTrackById(id) {
    return this.db.prepare('SELECT * FROM tracks WHERE id = ?').get(id);
  }

  deleteTrack(id) {
    return this.db.prepare('DELETE FROM tracks WHERE id = ?').run(id);
  }

  // Playlist operations
  getPlaylist() {
    const playlist = this.db.prepare('SELECT * FROM playlist WHERE id = 1').get();
    const items = this.db.prepare(`
      SELECT pi.track_id, pi.position, t.*
      FROM playlist_items pi
      JOIN tracks t ON pi.track_id = t.id
      WHERE pi.playlist_id = 1
      ORDER BY pi.position
    `).all();

    return {
      shuffleEnabled: Boolean(playlist.shuffle_enabled),
      startFromIndex: playlist.start_from_index || 0,
      tracks: items
    };
  }

  updatePlaylist(trackIds, shuffleEnabled, startFromIndex = 0) {
    const updatePlaylist = this.db.transaction(() => {
      // Clear existing playlist items
      this.db.prepare('DELETE FROM playlist_items WHERE playlist_id = 1').run();
      
      // Insert new playlist items
      const insert = this.db.prepare('INSERT INTO playlist_items (playlist_id, track_id, position) VALUES (1, ?, ?)');
      trackIds.forEach((trackId, index) => {
        insert.run(trackId, index);
      });

      // Update shuffle setting and start_from_index
      this.db.prepare('UPDATE playlist SET shuffle_enabled = ?, start_from_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
        .run(shuffleEnabled ? 1 : 0, startFromIndex);
    });

    updatePlaylist();
  }

  // Station state operations
  getStationState() {
    return this.db.prepare('SELECT * FROM station_state WHERE id = 1').get();
  }

  updateStationState(updates) {
    const fields = [];
    const values = [];

    if (updates.mode !== undefined) {
      fields.push('mode = ?');
      values.push(updates.mode);
    }
    if (updates.liveInputUrl !== undefined) {
      fields.push('live_input_url = ?');
      values.push(updates.liveInputUrl);
    }
    if (updates.liveBroadcastTitle !== undefined) {
      fields.push('live_broadcast_title = ?');
      values.push(updates.liveBroadcastTitle);
    }
    if (updates.isStreaming !== undefined) {
      fields.push('is_streaming = ?');
      values.push(updates.isStreaming ? 1 : 0);
    }
    if (updates.lastError !== undefined) {
      fields.push('last_error = ?');
      values.push(updates.lastError);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const query = `UPDATE station_state SET ${fields.join(', ')} WHERE id = 1`;
    return this.db.prepare(query).run(...values);
  }

  // Recently played operations
  addRecentlyPlayed(trackId) {
    this.db.prepare('INSERT INTO recently_played (track_id) VALUES (?)').run(trackId);
    
    // Keep only last 50 entries
    this.db.prepare(`
      DELETE FROM recently_played
      WHERE id NOT IN (
        SELECT id FROM recently_played ORDER BY played_at DESC LIMIT 50
      )
    `).run();
  }

  getRecentlyPlayed(limit = 10) {
    return this.db.prepare(`
      SELECT rp.*, t.title, t.artist, t.duration_sec
      FROM recently_played rp
      JOIN tracks t ON rp.track_id = t.id
      ORDER BY rp.played_at DESC
      LIMIT ?
    `).all(limit);
  }

  close() {
    this.db.close();
  }
}

module.exports = DatabaseService;
