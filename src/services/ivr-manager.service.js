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
      // Special handling for extension 208 IVR call start
      if (userInput === "IVR_CALL_START") {
        const welcomeMessage = "Hello! I'm your AI assistant. How can I help you today?";
        
        // Generate welcome audio
        const audioBuffer = await ttsService.synthesizeSpeech(welcomeMessage, 'en');
        const filename = `ai_response_${sessionId}_${Date.now()}.wav`;
        const localPath = path.join(__dirname, '../../audio', filename);
        fs.writeFileSync(localPath, audioBuffer);
        
        return {
          success: true,
          aiResponse: welcomeMessage,
          action: 'ivr_welcome',
          audioFile: filename
        };
      }
      
      const aiResponse = await geminiService.generateReply(sessionId, userInput);
      
      // Generate audio but don't upload - just log success
      const audioBuffer = await ttsService.synthesizeSpeech(aiResponse, 'en');
      
      const filename = `ai_response_${sessionId}_${Date.now()}.wav`;
      const localPath = path.join(__dirname, '../../audio', filename);
      fs.writeFileSync(localPath, audioBuffer);
      
      return {
        success: true,
        aiResponse,
        action: 'audio_generated',
        audioFile: filename
      };
      
    } catch (error) {
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
