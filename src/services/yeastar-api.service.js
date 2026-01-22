const axios = require('axios');
const config = require('../config/yeastar.config');

class YeastarAPIService {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
  }

  async login() {
    try {
      const response = await axios.post(`${config.pbxUrl}/api/v2.0.0/login`, {
        username: config.apiUsername,
        password: config.apiPassword,
        secret: config.apiSecret
      });
      
      this.token = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      
      return this.token;
    } catch (error) {
      console.error('Yeastar login error:', error);
      throw error;
    }
  }

  async getToken() {
    if (!this.token || Date.now() >= this.tokenExpiry) {
      await this.login();
    }
    return this.token;
  }

  async transferCallToIVR(callId, ivrNumber) {
    const token = await this.getToken();
    
    try {
      const response = await axios.post(
        `${config.pbxUrl}/api/v2.0.0/call/transfer?token=${token}`,
        {
          callid: callId,
          transferto: ivrNumber
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Transfer call error:', error);
      throw error;
    }
  }

  async playAudioToCall(callId, audioFilename) {
    const token = await this.getToken();
    
    try {
      const response = await axios.post(
        `${config.pbxUrl}/api/v2.0.0/call/play?token=${token}`,
        {
          callid: callId,
          filename: audioFilename,
          mode: 'play' // Play audio without hanging up
        }
      );
      
      console.log(`🔊 Playing audio ${audioFilename} to call ${callId}`);
      return response.data;
    } catch (error) {
      console.error('Play audio error:', error);
      // Don't throw error - continue call even if audio fails
      return { success: false, error: error.message };
    }
  }

  async updateIVRPrompt(ivrNumber, promptFilename) {
    const token = await this.getToken();
    
    try {
      const response = await axios.post(
        `${config.pbxUrl}/api/v2.0.0/ivr/update?token=${token}`,
        {
          ivrid: ivrNumber,
          prompt: promptFilename
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Update IVR error:', error);
      throw error;
    }
  }
}

module.exports = new YeastarAPIService();
