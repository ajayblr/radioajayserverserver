const fs = require('fs');
const path = require('path');

class HealthMonitor {
  constructor(db, streamController) {
    this.db = db;
    this.streamController = streamController;
    this.checkInterval = null;
    this.lastSegmentTime = Date.now();
    this.consecutiveFailures = 0;
  }

  start() {
    console.log('🏥 Health monitor started');
    
    // Check every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkHealth();
    }, 30000);
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🏥 Health monitor stopped');
    }
  }

  async checkHealth() {
    const state = this.db.getStationState();
    
    // Only monitor if supposed to be streaming
    if (!state.is_streaming) {
      this.consecutiveFailures = 0;
      return;
    }

    // Check if HLS segments are being created
    const hlsDir = this.streamController.config.HLS_DIR;
    const playlistPath = path.join(hlsDir, 'radioajay.m3u8');

    try {
      // Check if playlist file exists
      if (!fs.existsSync(playlistPath)) {
        console.log('⚠️ HLS playlist missing - stream may have crashed');
        this.handleFailure();
        return;
      }

      // Check if playlist was modified recently (within last 60 seconds)
      const stats = fs.statSync(playlistPath);
      const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;

      if (ageSeconds > 60) {
        console.log(`⚠️ HLS playlist stale (${Math.round(ageSeconds)}s old) - stream may be frozen`);
        this.handleFailure();
        return;
      }

      // Health check passed
      this.consecutiveFailures = 0;
      
    } catch (err) {
      console.error('Health check error:', err);
      this.handleFailure();
    }
  }

  handleFailure() {
    this.consecutiveFailures++;
    
    console.log(`❌ Health check failed (${this.consecutiveFailures} consecutive failures)`);

    // After 2 consecutive failures, attempt recovery
    if (this.consecutiveFailures >= 2) {
      console.log('🔄 AUTO-RECOVERY: Restarting stream...');
      this.attemptRecovery();
    }
  }

  async attemptRecovery() {
    try {
      // Stop existing stream
      await this.streamController.stop();
      
      // Wait 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Start fresh
      await this.streamController.start();
      
      console.log('✅ Auto-recovery completed');
      this.consecutiveFailures = 0;
      
    } catch (err) {
      console.error('❌ Auto-recovery failed:', err);
      
      // If recovery fails 3 times, give up and wait for manual intervention
      if (this.consecutiveFailures > 6) {
        console.error('🛑 Multiple recovery attempts failed. Manual intervention required.');
        this.db.updateStationState({ 
          isStreaming: false,
          lastError: 'Auto-recovery failed after multiple attempts' 
        });
        this.consecutiveFailures = 0;
      }
    }
  }
}

module.exports = HealthMonitor;
