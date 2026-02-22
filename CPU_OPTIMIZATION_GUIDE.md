# 🔧 CPU Optimization & Auto-Recovery Deployment Guide

## 🎯 What Was Fixed

### CPU Usage Reduced:
- ✅ **Audio bitrate**: 128k → 96k (25% reduction)
- ✅ **HLS segments**: 6s → 10s (longer segments = less CPU)
- ✅ **FFmpeg threads**: Limited to 1 (prevents spikes)
- ✅ **HLS playlist**: 10 segments → 6 (less memory)
- ✅ **Container CPU limit**: Max 80% CPU
- ✅ **Container memory limit**: 400MB max

### Auto-Recovery Added:
- ✅ **Health Monitor**: Checks stream every 30 seconds
- ✅ **Auto-restart**: Restarts crashed streams automatically
- ✅ **Crash detection**: Detects frozen/stale streams
- ✅ **Error handling**: Catches uncaught exceptions
- ✅ **Docker restart**: Always restarts on crash

---

## 📦 Deployment Steps

### On AWS Lightsail:

```bash
cd ~/radioajay
git pull origin main

# Stop current containers
docker compose down

# Rebuild with new optimizations
docker compose up -d --build

# Check logs
docker compose logs -f
```

### Expected Log Output:
```
✓ Database initialized
✓ Stream controller ready
🏥 Health monitor started
Server running on port 3000
Ready to rock! 🎸
```

---

## 🏥 How Auto-Recovery Works

### Health Monitor Checks:
1. **Every 30 seconds**: Checks if HLS playlist exists
2. **Checks freshness**: Playlist must be updated within 60s
3. **Detects crashes**: If 2 consecutive failures → auto-restart
4. **Logs recovery**: You'll see "🔄 AUTO-RECOVERY: Restarting stream..."

### What Happens on Crash:
```
❌ FFmpeg crashes
⚠️ Health check fails
⚠️ Health check fails again (2nd failure)
🔄 AUTO-RECOVERY: Restarting stream...
✓ Stream restarted successfully
```

---

## 📊 Expected CPU Usage

**Before:**
- Baseline: ~5%
- Spikes: 70-80% (causing crashes)

**After:**
- Baseline: ~3-4%
- Max: ~15-20% (much safer)
- Container limit: 80% (hard cap)

---

## 🔍 Monitoring

### Check if auto-recovery is working:
```bash
# View logs
docker compose logs -f radioajay

# Look for these messages:
# 🏥 Health monitor started
# ⚠️ Health check failed
# 🔄 AUTO-RECOVERY: Restarting stream...
# ✅ Auto-recovery completed
```

### Check CPU usage:
```bash
# Real-time monitoring
docker stats radioajay

# Should show CPU% staying under 20%
```

---

## 🛠️ Manual Intervention (If Needed)

If auto-recovery fails 3+ times:
```bash
# Stop everything
docker compose down

# Clear HLS cache
rm -rf data/hls/*

# Restart
docker compose up -d

# Start station from admin panel
```

---

## ⚙️ Configuration Changes

### docker-compose.yml:
- `HLS_SEGMENT_DURATION`: 4 → 10 (longer segments)
- `HLS_PLAYLIST_SIZE`: 5 → 6 (balanced)
- `CPU limit`: 80%
- `Memory limit`: 400M
- `restart`: always (was unless-stopped)

### FFmpeg Settings:
- Bitrate: 96k (instead of 128k)
- Threads: 1 (prevents multi-core spikes)
- Segments: 10s (instead of 6s)

---

## 🎵 Audio Quality

**96kbps AAC is still excellent quality for:**
- ✅ Voice/talk radio
- ✅ Most music
- ✅ Background listening
- ✅ Mobile streaming

**Not noticeable unless:**
- ❌ High-end audiophile equipment
- ❌ Classical music with wide dynamic range
- ❌ A/B testing with 128k

**If you want higher quality**, you can change it back:
```bash
# In streamController.js, line 120:
'-b:a', '128k',  // Change from 96k to 128k
```

---

## 📈 What to Expect

### First 24 Hours:
- Monitor CPU in Lightsail dashboard
- Should stay in "Sustainable zone" (green)
- No more spikes to 70-80%

### Auto-Recovery:
- If stream crashes, auto-restarts within 60 seconds
- You'll see notifications in logs
- Station continues playing without manual intervention

### Long-term:
- 24/7 operation without manual restarts
- Crashes → auto-recover
- CPU stays low and stable

---

## 🚨 Troubleshooting

### If CPU still spikes:
1. Check uploaded files: `ls -lh data/media/`
2. Large files? Convert to lower bitrate:
   ```bash
   ffmpeg -i input.mp3 -b:a 96k output.mp3
   ```

### If stream still crashes:
1. Check Docker logs: `docker compose logs -f`
2. Look for FFmpeg errors
3. Check disk space: `df -h`

### If auto-recovery fails:
1. Check health monitor is running
2. Restart Docker: `docker compose restart`

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ CPU stays under 20% in Lightsail dashboard
- ✅ Green "Sustainable zone" all day
- ✅ Stream plays 24/7 without manual restarts
- ✅ Logs show "Health monitor started"
- ✅ No more manual reboots needed!

---

Deploy and monitor for 24 hours. CPU should stay low and stable! 📊✅
