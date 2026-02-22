require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const cookieParser = require('cookie-parser');

// Services and models
const DatabaseService = require('./models/database');
const StreamController = require('./services/streamController');
const HealthMonitor = require('./services/healthMonitor');

// Controllers
const AuthController = require('./controllers/authController');
const TracksController = require('./controllers/tracksController');
const PlaylistController = require('./controllers/playlistController');
const StationController = require('./controllers/stationController');
const PublicController = require('./controllers/publicController');
const ContactController = require('./controllers/contactController');

// Middleware
const authMiddleware = require('./middleware/auth');

// Configuration
const config = {
  PORT: process.env.PORT || 3000,
  MEDIA_DIR: process.env.MEDIA_DIR || path.join(__dirname, '../data/media'),
  HLS_DIR: process.env.HLS_DIR || path.join(__dirname, '../data/hls'),
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '../data/db/radioajay.db'),
  HLS_SEGMENT_DURATION: parseInt(process.env.HLS_SEGMENT_DURATION) || 4,
  HLS_PLAYLIST_SIZE: parseInt(process.env.HLS_PLAYLIST_SIZE) || 5,
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};

// Ensure directories exist
[config.MEDIA_DIR, config.HLS_DIR, path.dirname(config.DB_PATH)].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize database and services
const db = new DatabaseService(config.DB_PATH);
const streamController = new StreamController(db, config);
const healthMonitor = new HealthMonitor(db, streamController);

// Start health monitor
healthMonitor.start();

// Initialize controllers
const authController = new AuthController();
const tracksController = new TracksController(db, config);
const playlistController = new PlaylistController(db);
const stationController = new StationController(db, streamController);
const publicController = new PublicController(db, streamController);
const contactController = new ContactController(db);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.MEDIA_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.originalname.endsWith('.mp3')) {
      cb(null, true);
    } else {
      cb(new Error('Only MP3 files are allowed'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per file
    files: 100 // Allow up to 100 files at once
  }
});

// Initialize Express app
const app = express();

// Middleware
app.use(cors({ 
  origin: config.CORS_ORIGIN,
  credentials: true 
}));
app.use(express.json({ limit: '500mb' })); // Increase JSON body limit
app.use(express.urlencoded({ extended: true, limit: '500mb' })); // Increase URL-encoded body limit
app.use(cookieParser());

// Serve HLS stream
app.use('/stream', express.static(config.HLS_DIR, {
  setHeaders: (res, path) => {
    if (path.endsWith('.m3u8')) {
      res.set('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (path.endsWith('.ts')) {
      res.set('Content-Type', 'video/MP2T');
    }
  }
}));

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin')));

// Public API routes
app.get('/api/now-playing', publicController.getNowPlaying.bind(publicController));
app.get('/api/recently-played', publicController.getRecentlyPlayed.bind(publicController));
app.get('/api/upcoming', publicController.getUpcoming.bind(publicController));
app.post('/api/contact', contactController.submitContact.bind(contactController));

// Auth routes
app.post('/api/admin/login', authController.login.bind(authController));
app.post('/api/admin/logout', authMiddleware, authController.logout.bind(authController));
app.get('/api/admin/verify', authMiddleware, authController.verify.bind(authController));

// Admin routes - Contact messages
app.get('/api/admin/contact-messages', authMiddleware, contactController.getMessages.bind(contactController));
app.put('/api/admin/contact-messages/:id/read', authMiddleware, contactController.markAsRead.bind(contactController));
app.delete('/api/admin/contact-messages/:id', authMiddleware, contactController.deleteMessage.bind(contactController));

// Admin routes - Track management
app.post('/api/admin/upload', authMiddleware, upload.array('tracks'), tracksController.uploadTracks.bind(tracksController));
app.get('/api/admin/tracks', authMiddleware, tracksController.getAllTracks.bind(tracksController));
app.delete('/api/admin/tracks/:id', authMiddleware, tracksController.deleteTrack.bind(tracksController));

// Admin routes - Playlist management
app.get('/api/admin/playlist', authMiddleware, playlistController.getPlaylist.bind(playlistController));
app.put('/api/admin/playlist', authMiddleware, playlistController.updatePlaylist.bind(playlistController));

// Admin routes - Station control
app.post('/api/admin/station/start', authMiddleware, stationController.startStation.bind(stationController));
app.post('/api/admin/station/stop', authMiddleware, stationController.stopStation.bind(stationController));
app.post('/api/admin/station/mode', authMiddleware, stationController.setMode.bind(stationController));
app.put('/api/admin/station/live-input', authMiddleware, stationController.setLiveInput.bind(stationController));
app.put('/api/admin/station/live-title', authMiddleware, stationController.setLiveBroadcastTitle.bind(stationController));
app.get('/api/admin/station/status', authMiddleware, stationController.getStatus.bind(stationController));
app.post('/api/admin/station/skip', authMiddleware, stationController.skipTrack.bind(stationController));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 100MB)' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(config.PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║      🎵 RadioAjay Server Started     ║
╚═══════════════════════════════════════╝

  Server:    http://localhost:${config.PORT}
  Player:    http://localhost:${config.PORT}/
  Admin:     http://localhost:${config.PORT}/admin
  Stream:    http://localhost:${config.PORT}/stream/radioajay.m3u8
  
  Environment: ${process.env.NODE_ENV || 'development'}
  
  Ready to rock! 🎸
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  healthMonitor.stop();
  streamController.stop();
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  healthMonitor.stop();
  streamController.stop();
  db.close();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // Don't exit - let health monitor handle recovery
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - let health monitor handle recovery
});
