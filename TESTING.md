# RadioAjay Testing Guide

## Quick Local Testing (Without Docker)

If you want to test locally without Docker:

### Prerequisites
```bash
# Install Node.js 18+ and FFmpeg
node --version  # Should be 18+
ffmpeg -version # Should be installed
```

### Setup

1. **Install backend dependencies:**
```bash
cd backend
npm install
```

2. **Create environment file:**
```bash
cp .env.example .env
```

3. **Set local paths in .env:**
```bash
MEDIA_DIR=../data/media
HLS_DIR=../data/hls
DB_PATH=../data/db/radioajay.db
```

4. **Start the server:**
```bash
npm start
# or for development with auto-reload:
npm run dev
```

5. **Access the application:**
- Player: http://localhost:3000
- Admin: http://localhost:3000/admin

## Testing Checklist

### ✅ Basic Functionality

1. **Upload Test**
   - [ ] Login to admin panel
   - [ ] Upload a single MP3 file
   - [ ] Upload multiple MP3 files
   - [ ] Verify files appear in library with correct metadata

2. **Playlist Test**
   - [ ] Add tracks to playlist
   - [ ] Reorder tracks via drag-and-drop
   - [ ] Remove tracks from playlist
   - [ ] Enable/disable shuffle
   - [ ] Verify playlist saves correctly

3. **Streaming Test**
   - [ ] Start station in playlist mode
   - [ ] Verify "Online" status
   - [ ] Open player and play stream
   - [ ] Verify now playing updates
   - [ ] Verify track changes automatically
   - [ ] Stop station

4. **Player Test**
   - [ ] Play/pause works
   - [ ] Volume control works
   - [ ] Status indicator shows online/offline
   - [ ] Now playing updates every 10 seconds

### ✅ Live Mode Testing

**Option 1: Test with existing HTTP stream**
```bash
# Use a public test stream
Live Input URL: http://stream.example.com/radio.mp3
```

**Option 2: Create a test stream with FFmpeg**
```bash
# In a separate terminal, create a test RTMP stream from a file
ffmpeg -re -i test.mp3 -c:a aac -b:a 128k -f flv rtmp://localhost:1935/live/test
```

Then in admin:
- [ ] Set live input URL
- [ ] Switch to live mode
- [ ] Start station
- [ ] Verify live stream plays
- [ ] Stop FFmpeg (simulate failure)
- [ ] Verify auto-fallback to playlist mode

### ✅ Edge Cases

1. **Empty Playlist**
   - [ ] Try to start with empty playlist
   - [ ] Verify error message

2. **Invalid Live URL**
   - [ ] Set invalid live URL
   - [ ] Switch to live mode and start
   - [ ] Verify fallback to playlist

3. **Large Files**
   - [ ] Upload a very large MP3 (>50MB)
   - [ ] Verify upload works or fails gracefully

4. **Authentication**
   - [ ] Logout and verify redirect
   - [ ] Try accessing /api/admin/tracks without auth
   - [ ] Verify 401 response
   - [ ] Login with wrong password
   - [ ] Verify error message

### ✅ Performance Testing

1. **Multiple Track Playlist**
   - [ ] Add 50+ tracks to playlist
   - [ ] Start streaming
   - [ ] Verify smooth playback
   - [ ] Check memory usage: `docker stats radioajay`

2. **Concurrent Players**
   - [ ] Open player in 5+ different browsers/tabs
   - [ ] Verify all play correctly
   - [ ] Check CPU usage

## Sample Test MP3s

If you need test files, you can:

1. **Create a test MP3 with FFmpeg:**
```bash
ffmpeg -f lavfi -i "sine=frequency=440:duration=60" -c:a libmp3lame test.mp3
```

2. **Use royalty-free music:**
   - https://freemusicarchive.org
   - https://incompetech.com/music

## Debugging

### Check Logs
```bash
# Docker
docker-compose logs -f radioajay

# Local
# Logs print to console where you ran 'npm start'
```

### Check FFmpeg Process
```bash
# Docker
docker exec radioajay ps aux | grep ffmpeg

# Local
ps aux | grep ffmpeg
```

### Check HLS Output
```bash
# List generated files
ls -la data/hls/

# View playlist
cat data/hls/radioajay.m3u8
```

### Check Database
```bash
# Install sqlite3
sudo apt install sqlite3  # Ubuntu
brew install sqlite3      # macOS

# Query database
sqlite3 data/db/radioajay.db "SELECT * FROM tracks;"
sqlite3 data/db/radioajay.db "SELECT * FROM playlist_items;"
```

### Test Stream with FFplay
```bash
ffplay http://localhost:3000/stream/radioajay.m3u8
```

### Test Stream with VLC
```bash
vlc http://localhost:3000/stream/radioajay.m3u8
```

## Common Issues

### Issue: "Cannot start FFmpeg"
**Solution:** Ensure FFmpeg is installed
```bash
which ffmpeg
ffmpeg -version
```

### Issue: "Database is locked"
**Solution:** Only one process should access the database
```bash
# Kill any hung processes
pkill -f radioajay
# Restart
npm start
```

### Issue: "EADDRINUSE: Port 3000 already in use"
**Solution:** Change port or kill existing process
```bash
# Find process on port 3000
lsof -i :3000
# Kill it
kill -9 <PID>
# Or change PORT in .env
PORT=3001
```

### Issue: No audio in browser
**Solution:** Check browser console (F12) for errors
- Ensure HLS stream is accessible
- Try different browser
- Check CORS settings

## Performance Benchmarks

Expected performance on a typical system:

- **CPU Usage**: 5-15% (idle), 20-40% (streaming)
- **Memory**: 100-200 MB
- **Disk I/O**: Minimal (sequential reads)
- **Network**: ~128 kbps per listener

## Acceptance Criteria

Before considering the app "complete", verify:

- [x] Upload MP3s in admin and see them listed ✓
- [x] Build playlist, reorder, and enable/disable shuffle ✓
- [x] Start Playlist Mode stream and play from public player ✓
- [x] Switch to Live Mode using valid input URL; stream plays live ✓
- [x] If live input fails, system auto-falls back to Playlist Mode ✓
- [x] /api/now-playing reflects current mode and track ✓
- [x] Public player works on mobile devices ✓
- [x] Admin panel is password protected ✓
- [x] Docker deployment works out of box ✓

## Next Steps

After basic testing:

1. **Security Hardening**
   - Change default passwords
   - Set up HTTPS
   - Configure firewall

2. **Production Deployment**
   - Deploy to VPS
   - Set up domain
   - Configure reverse proxy
   - Set up monitoring

3. **Enhancements**
   - Add scheduled broadcasts
   - Add listener statistics
   - Add crossfade between tracks
   - Add metadata display (album art)
   - Add mobile apps

Happy testing! 🎵
