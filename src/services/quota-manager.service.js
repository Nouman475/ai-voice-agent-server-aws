// Quota management for API calls
class QuotaManager {
  constructor() {
    this.requestCounts = new Map();
    this.resetInterval = 60000; // 1 minute
    this.maxRequestsPerMinute = 15; // Conservative limit
    
    // Reset counters every minute
    setInterval(() => {
      this.requestCounts.clear();
    }, this.resetInterval);
  }

  canMakeRequest(apiKey) {
    const currentCount = this.requestCounts.get(apiKey) || 0;
    return currentCount < this.maxRequestsPerMinute;
  }

  recordRequest(apiKey) {
    const currentCount = this.requestCounts.get(apiKey) || 0;
    this.requestCounts.set(apiKey, currentCount + 1);
  }

  getRemainingRequests(apiKey) {
    const currentCount = this.requestCounts.get(apiKey) || 0;
    return Math.max(0, this.maxRequestsPerMinute - currentCount);
  }

  getWaitTime() {
    return 60; // Wait 1 minute if quota exceeded
  }
}

module.exports = new QuotaManager();