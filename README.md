# 🎵 RadioAjay - Personal Radio Station

A lightweight, self-hosted radio streaming application for hosting your own internet radio station with continuous playlist streaming (AutoDJ) and optional live input capabilities.

## ✨ Features

- **Playlist Mode (AutoDJ)**: Continuous MP3 playlist streaming with shuffle support
- **Live Mode**: Stream from external live sources (RTMP, HTTP streams) with auto-fallback
- **HLS Streaming**: Industry-standard HTTP Live Streaming for compatibility
- **Web Player**: Clean, responsive public player interface
- **Admin Panel**: Full-featured management interface with drag-drop playlist builder
- **Single User**: Simple password-based authentication for one admin
- **Docker Ready**: Easy deployment with Docker Compose

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- (Optional) A few MP3 files to get started

### Installation

1. **Clone or download this repository**

```bash
cd radioajay
```

2. **Create environment file**

```bash
cp .env.example .env
```

Edit `.env` and change the admin password:

```env
ADMIN_PASSWORD=your_secure_password_here
JWT_SECRET=your_random_secret_key_here
```

3. **Start the application**

```bash
docker-compose up -d
```

4. **Access the application**

- **Public Player**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin
- **HLS Stream**: http://localhost:3000/stream/radioajay.m3u8

## 📖 Usage Guide

### First Time Setup

1. **Login to Admin Panel**
   - Navigate to http://localhost:3000/admin
   - Enter your admin password (default: `radioajay123`)

2. **Upload MP3 Files**
   - Click the "Upload MP3s" section
   - Select one or more MP3 files
   - Wait for upload to complete

3. **Build Your Playlist**
   - Find your uploaded tracks in the "Library" section
   - Click the "+" button to add tracks to the playlist
   - Drag and drop tracks to reorder them
   - Enable "Shuffle" if desired

4. **Start Broadcasting**
   - Click the "▶ Start" button in the "Station Control" section
   - Your stream is now live!

5. **Listen**
   - Open http://localhost:3000 in a new tab or browser
   - Click the play button

### Using Live Mode

Live mode allows you to broadcast from an external encoder (OBS, BUTT, etc.) or relay another stream.

**Example: Stream from OBS Studio**

1. In OBS, go to Settings → Stream
2. Set up a custom RTMP server or use an existing stream URL
3. In RadioAjay Admin Panel:
   - Enter your live stream URL in the "Live Input URL" field
   - Click "Save"
   - Select "🔴 Live Mode"
   - Click "▶ Start"

**Example Live Input URLs:**
```
rtmp://localhost:1935/live/stream
http://stream.example.com:8000/stream.mp3
https://icecast.example.com/radio.opus
```

**Auto-Fallback**: If the live input fails or disconnects, RadioAjay automatically switches back to Playlist Mode.

## 🎛️ Admin Panel Features

### Station Control

- **Start/Stop**: Control the broadcast
- **Mode Selection**: Switch between Playlist and Live modes
- **Status Monitoring**: Real-time status, now playing, and stream health

### Library Management

- Upload multiple MP3 files at once
- Automatic metadata extraction (title, artist, duration)
- View all uploaded tracks

### Playlist Builder

- Add tracks from library
- Drag-and-drop reordering
- Remove tracks
- Shuffle toggle for random playback
- Automatic looping

## 📡 Streaming Details

### HLS Configuration

RadioAjay uses HTTP Live Streaming (HLS) with the following settings:

- **Codec**: AAC 128kbps, 44.1kHz
- **Segment Duration**: 4 seconds
- **Playlist Size**: 5 segments
- **Format**: .m3u8 playlist + .ts segments

You can adjust these in your `.env` file:

```env
HLS_SEGMENT_DURATION=4
HLS_PLAYLIST_SIZE=5
```

### Stream URL

Your stream is available at:
```
http://your-server:3000/stream/radioajay.m3u8
```

This can be played in:
- Any HLS-compatible player (VLC, ffplay, etc.)
- Modern web browsers (via hls.js)
- Mobile apps that support HLS

## 🐳 Docker Configuration

### Default Setup

The default `docker-compose.yml` runs RadioAjay on port 3000 with persistent storage:

```yaml
ports:
  - "3000:3000"
volumes:
  - ./data/media:/app/data/media
  - ./data/hls:/app/data/hls
  - ./data/db:/app/data/db
```

### Optional Nginx Reverse Proxy

For better performance, you can enable the Nginx reverse proxy:

1. Uncomment the `nginx` service in `docker-compose.yml`
2. Restart: `docker-compose up -d`
3. Access on port 80 instead of 3000

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_PASSWORD` | `radioajay123` | Admin panel password |
| `JWT_SECRET` | (random) | JWT signing secret |
| `HLS_SEGMENT_DURATION` | `4` | HLS segment length in seconds |
| `HLS_PLAYLIST_SIZE` | `5` | Number of segments in playlist |
| `LIVE_INPUT_URL` | (empty) | Default live input URL |
| `CORS_ORIGIN` | `*` | CORS origin setting |

## 🔧 Troubleshooting

### No audio in player

**Check 1**: Is the station started?
- Open admin panel and verify status shows "Online"

**Check 2**: Is the HLS playlist accessible?
- Open http://localhost:3000/stream/radioajay.m3u8 in your browser
- You should see a text playlist file

**Check 3**: Check browser console for errors
- Press F12 in your browser
- Look for HLS or network errors

### HLS playlist not updating

**Check 1**: Verify FFmpeg is running
```bash
docker-compose logs radioajay
```
Look for FFmpeg output or errors.

**Check 2**: Check HLS directory permissions
```bash
ls -la data/hls/
```
Ensure the directory is writable.

**Fix**: Restart the container
```bash
docker-compose restart radioajay
```

### Permission errors

If you see permission errors in the logs:

```bash
# Fix permissions
sudo chown -R 1000:1000 data/
docker-compose restart radioajay
```

### Live mode fails immediately

**Check 1**: Verify live input URL is correct
- Test the URL in VLC or ffplay first
- Ensure it's accessible from inside the Docker container

**Check 2**: Check FFmpeg logs
```bash
docker-compose logs -f radioajay
```
Look for FFmpeg error messages.

### Upload fails

**Check 1**: File size
- Maximum file size is 100MB per file
- You can change this in `backend/src/server.js`

**Check 2**: File format
- Only MP3 files are accepted
- Ensure files have `.mp3` extension

### Database locked errors

If you see "database is locked" errors:

```bash
# Restart the container
docker-compose restart radioajay
```

## 🗂️ Project Structure

```
radioajay/
├── backend/
│   ├── src/
│   │   ├── controllers/      # API controllers
│   │   ├── services/         # Business logic (stream controller)
│   │   ├── models/          # Database layer
│   │   ├── middleware/      # Auth middleware
│   │   └── server.js        # Main application
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/              # Public player
│   │   └── index.html
│   └── admin/               # Admin panel
│       └── index.html
├── docker/
│   └── nginx.conf           # Optional Nginx config
├── data/
│   ├── media/               # Uploaded MP3s
│   ├── hls/                 # HLS output
│   └── db/                  # SQLite database
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## 🔒 Security Notes

**For Production Use:**

1. **Change default passwords**:
   ```env
   ADMIN_PASSWORD=very_secure_password_here
   JWT_SECRET=random_64_character_string_here
   ```

2. **Use HTTPS**: Set up a reverse proxy with SSL (Nginx, Caddy, etc.)

3. **Restrict CORS**: Change `CORS_ORIGIN` to your domain:
   ```env
   CORS_ORIGIN=https://yourdomain.com
   ```

4. **Firewall**: Only expose necessary ports (80/443 for web, not 3000)

5. **Regular updates**: Keep Docker images and dependencies updated

## 🛠️ Development

### Running without Docker

1. **Install FFmpeg**
   ```bash
   # Ubuntu/Debian
   sudo apt install ffmpeg
   
   # macOS
   brew install ffmpeg
   ```

2. **Install Node.js dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Create .env file**
   ```bash
   cp .env.example .env
   ```

4. **Start the server**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

## 📝 API Documentation

### Public Endpoints

- `GET /api/now-playing` - Current track info
- `GET /api/recently-played?limit=10` - Recently played tracks
- `GET /stream/radioajay.m3u8` - HLS stream

### Admin Endpoints (require authentication)

**Authentication:**
- `POST /api/admin/login` - Login with password
- `POST /api/admin/logout` - Logout
- `GET /api/admin/verify` - Verify token

**Tracks:**
- `POST /api/admin/upload` - Upload MP3 files
- `GET /api/admin/tracks` - List all tracks
- `DELETE /api/admin/tracks/:id` - Delete track

**Playlist:**
- `GET /api/admin/playlist` - Get playlist
- `PUT /api/admin/playlist` - Update playlist

**Station:**
- `POST /api/admin/station/start` - Start stream
- `POST /api/admin/station/stop` - Stop stream
- `POST /api/admin/station/mode` - Set mode (playlist/live)
- `PUT /api/admin/station/live-input` - Set live input URL
- `GET /api/admin/station/status` - Get station status

## 📄 License

MIT License - Feel free to use this for personal or commercial projects.

## 🤝 Contributing

Contributions welcome! Feel free to open issues or pull requests.

## ❓ Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Docker logs: `docker-compose logs -f`
3. Open an issue on GitHub with logs and error details

---

**Enjoy your personal radio station! 🎵📻**
