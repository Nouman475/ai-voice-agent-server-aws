const ttsService = require('./tts.service');
const audioUploadService = require('./audio-upload.service');
const yeastarAPI = require('./yeastar-api.service');
const geminiService = require('./gemini.service');
const fs = require('fs');
const path = require('path');

class IVRManagerService {
  constructor() {
    this.availableIVRs = [...require('../config/yeastar.config').responseIVRs];
    this.ivrQueue = [];
  }

  async processUserInput(sessionId, userInput, callId) {
    try {
      console.log(`🎯 Processing input: ${userInput} for call: ${callId}`);
      
      // Special handling for extension 208 IVR call start
      if (userInput === "IVR_CALL_START") {
        const welcomeMessage = "Hello! I'm your AI assistant. How can I help you today?";
        console.log(`🤖 AI Welcome: ${welcomeMessage}`);
        
        // Generate welcome audio
        const audioBuffer = await ttsService.synthesizeSpeech(welcomeMessage, 'en');
        const filename = `ai_response_${sessionId}_${Date.now()}.wav`;
        const localPath = path.join(__dirname, '../../audio', filename);
        fs.writeFileSync(localPath, audioBuffer);
        console.log(`📦 Welcome audio saved: ${filename}`);
        
        return {
          success: true,
          aiResponse: welcomeMessage,
          action: 'ivr_welcome',
          audioFile: filename
        };
      }
      
      const aiResponse = await geminiService.generateReply(sessionId, userInput);
      console.log(`🤖 AI Response: ${aiResponse}`);
      
      // Generate audio but don't upload - just log success
      const audioBuffer = await ttsService.synthesizeSpeech(aiResponse, 'en');
      
      const filename = `ai_response_${sessionId}_${Date.now()}.wav`;
      const localPath = path.join(__dirname, '../../audio', filename);
      fs.writeFileSync(localPath, audioBuffer);
      console.log(`💾 Audio saved locally: ${filename}`);
      
      // Skip SFTP upload for now - just return success
      console.log(`✅ Audio ready for playback (SFTP upload skipped)`);
      
      return {
        success: true,
        aiResponse,
        action: 'audio_generated',
        audioFile: filename
      };
      
    } catch (error) {
      console.error('IVR processing error:', error);
      
      return {
        success: false,
        aiResponse: 'Thank you for your selection. Please hold.',
        error: error.message
      };
    }
  }

  getNextIVR() {
    const ivr = this.availableIVRs.shift();
    this.availableIVRs.push(ivr);
    return ivr;
  }
}

module.exports = new IVRManagerService();
