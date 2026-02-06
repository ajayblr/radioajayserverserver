# RadioAjay Quick Reference Card

## 🚀 Quick Start
```bash
cp .env.example .env           # Create config
# Edit .env, set ADMIN_PASSWORD
docker-compose up -d           # Start
```

## 🔗 URLs
- Player: http://localhost:3000
- Admin: http://localhost:3000/admin
- Stream: http://localhost:3000/stream/radioajay.m3u8

## 🎛️ Docker Commands
```bash
docker-compose up -d           # Start in background
docker-compose down            # Stop
docker-compose logs -f         # View logs
docker-compose restart         # Restart
docker-compose ps              # Status
```

## 📂 Important Files
```
.env                          # Configuration
docker-compose.yml            # Deployment config
README.md                     # Full documentation
TESTING.md                    # Testing guide
PROJECT_SUMMARY.md            # This summary
```

## 🔑 Default Credentials
- Password: `radioajay123`
- ⚠️ CHANGE THIS in `.env` before deployment!

## 🎵 Basic Workflow
1. Login to admin panel
2. Upload MP3 files
3. Add tracks to playlist
4. Click "Start" button
5. Open public player
6. Click play

## 🔴 Live Mode Setup
1. Set "Live Input URL" in admin
2. Switch to "Live Mode"
3. Click "Start"
4. If live fails → auto-switches to playlist

## 📊 Data Locations
```
data/media/    # Uploaded MP3 files
data/hls/      # HLS stream segments
data/db/       # SQLite database
```

## 🔧 Troubleshooting
```bash
# View logs
docker-compose logs -f radioajay

# Restart
docker-compose restart

# Check if running
docker-compose ps

# Fix permissions
sudo chown -R 1000:1000 data/

# Test stream
ffplay http://localhost:3000/stream/radioajay.m3u8
```

## 📡 Stream Info
- Format: HLS (HTTP Live Streaming)
- Codec: AAC 128kbps, 44.1kHz
- Segment: 4 seconds
- Latency: ~12-20 seconds

## 🛡️ Security
```env
# In .env file:
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=random_64_char_string
CORS_ORIGIN=https://yourdomain.com
```

## 📝 Environment Variables
```env
ADMIN_PASSWORD=radioajay123        # Admin password
JWT_SECRET=change-this             # JWT secret
HLS_SEGMENT_DURATION=4             # Segment length
HLS_PLAYLIST_SIZE=5                # Playlist size
LIVE_INPUT_URL=                    # Default live URL
CORS_ORIGIN=*                      # CORS setting
```

## 🔌 API Quick Ref
```bash
# Public
GET /api/now-playing
GET /api/recently-played

# Admin (needs auth token)
POST /api/admin/login
POST /api/admin/upload
GET  /api/admin/tracks
GET  /api/admin/playlist
PUT  /api/admin/playlist
POST /api/admin/station/start
POST /api/admin/station/stop
POST /api/admin/station/mode
PUT  /api/admin/station/live-input
GET  /api/admin/station/status
```

## 🎨 Customization
```bash
# Change station name
vim frontend/public/index.html     # Line ~42
vim frontend/admin/index.html      # Line ~253

# Change colors
# Edit gradient in both HTML files (search for "667eea")

# Change port
# Edit docker-compose.yml ports section
```

## 📦 Backup
```bash
# Backup data
tar -czf radioajay-backup.tar.gz data/

# Restore
tar -xzf radioajay-backup.tar.gz
```

## 🔄 Update
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

## 📞 Get Help
1. Check logs: `docker-compose logs -f`
2. Read README.md
3. Check TESTING.md
4. Review troubleshooting section

---
**RadioAjay v1.0** | Quick Reference
