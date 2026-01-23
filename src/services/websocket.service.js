const WebSocket = require('ws');
const sttService = require('./stt.service');
const geminiService = require('./gemini.service');
const ttsService = require('./tts.service');
const { createSession, getSession } = require('./call-session.service');

class YeastarWebSocketService {
  constructor() {
    this.wss = null;
    this.activeCalls = new Map(); // callId -> { ws, sessionId, audioBuffer }
  }

  start(port = 4000) {
    this.wss = new WebSocket.Server({ port });
    
    console.log(`🎧 Voice WebSocket Server running on ws://localhost:${port}`);
    
    this.wss.on('connection', (ws, req) => {
      console.log('🔗 Voice WebSocket connected');
      
      ws.on('message', async (data) => {
        try {
          await this.handleMessage(ws, data);
        } catch (error) {
          console.error('Voice WebSocket error:', error);
          ws.send(JSON.stringify({ error: error.message }));
        }
      });

      ws.on('close', () => {
        console.log('🔌 Voice WebSocket disconnected');
        this.cleanupConnection(ws);
      });

      ws.on('error', (error) => {
        console.error('Voice WebSocket error:', error);
      });
      
      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connection_ready',
        message: 'WebSocket connected successfully'
      }));
    });
  }

  async handleMessage(ws, data) {
    // Parse Yeastar message
    const message = JSON.parse(data.toString());
    
    switch (message.type) {
      case 'call_start':
        await this.handleCallStart(ws, message);
        break;
      case 'audio_data':
        await this.handleAudioData(ws, message);
        break;
      case 'call_end':
        await this.handleCallEnd(ws, message);
        break;
      default:
        break;
    }
  }

  async handleCallStart(ws, message) {
    const { callId, from, to } = message;
    const sessionId = createSession();
    
    this.activeCalls.set(callId, {
      ws,
      sessionId,
      audioBuffer: Buffer.alloc(0),
      from,
      to
    });

    console.log(`📞 Voice Call Started: ${callId}`);
    
    // Send welcome message
    const welcomeText = "آپ کا خیر مقدم ہے، میں آپ کی کیسے مدد کر سکتا ہوں؟";
    const welcomeAudio = await ttsService.synthesizeSpeech(welcomeText, 'ur');
    
    ws.send(JSON.stringify({
      type: 'audio_response',
      callId,
      audio: welcomeAudio.toString('base64')
    }));
  }

  async handleAudioData(ws, message) {
    const { callId, audio } = message;
    const call = this.activeCalls.get(callId);
    
    if (!call) {
      return;
    }

    // Accumulate audio data
    const audioChunk = Buffer.from(audio, 'base64');
    call.audioBuffer = Buffer.concat([call.audioBuffer, audioChunk]);

    // Process when we have enough audio (e.g., 3 seconds at 8kHz)
    const minAudioSize = 8000 * 2 * 3; // 3 seconds of 16-bit audio at 8kHz
    
    if (call.audioBuffer.length >= minAudioSize) {
      await this.processAudio(call, callId);
      call.audioBuffer = Buffer.alloc(0); // Reset buffer
    }
  }

  async processAudio(call, callId) {
    try {
      // 1. Speech to Text
      const userText = await sttService.transcribeAudio(call.audioBuffer);
      console.log(`🎤 Voice Transcription: ${userText}`);

      // 2. AI Response
      const aiReply = await geminiService.generateReply(call.sessionId, userText);
      console.log(`🤖 Voice Response: ${aiReply}`);

      // 3. Text to Speech
      const audioResponse = await ttsService.synthesizeSpeech(aiReply, 'ur');

      // 4. Send back to Yeastar
      call.ws.send(JSON.stringify({
        type: 'audio_response',
        callId,
        audio: audioResponse.toString('base64')
      }));

    } catch (error) {
      console.error('Voice processing error:', error);
      
      // Send error response
      const errorText = "معذرت، میں آپ کو سمجھ نہیں سکا۔ براہ کرم دوبارہ کہیں۔";
      const errorAudio = await ttsService.synthesizeSpeech(errorText, 'ur');
      
      call.ws.send(JSON.stringify({
        type: 'audio_response',
        callId,
        audio: errorAudio.toString('base64')
      }));
    }
  }

  async handleCallEnd(ws, message) {
    const { callId } = message;
    console.log(`📞 Voice Call Ended: ${callId}`);
    
    this.activeCalls.delete(callId);
  }

  cleanupConnection(ws) {
    // Remove all calls associated with this WebSocket
    for (const [callId, call] of this.activeCalls.entries()) {
      if (call.ws === ws) {
        this.activeCalls.delete(callId);

      }
    }
  }
}

module.exports = new YeastarWebSocketService();