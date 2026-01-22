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
    
    console.log(`🎧 WebSocket Audio Server running on ws://localhost:${port}`);
    console.log(`📡 Yeastar should connect to: ws://192.168.33.102:${port}`);
    
    this.wss.on('connection', (ws, req) => {
      console.log('🔗 Yeastar WebSocket connected from:', req.socket.remoteAddress);
      console.log('📋 Connection headers:', req.headers);
      
      ws.on('message', async (data) => {
        try {
          console.log('📨 Raw message received:', data.toString());
          await this.handleMessage(ws, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ error: error.message }));
        }
      });

      ws.on('close', () => {
        console.log('🔌 Yeastar WebSocket disconnected');
        this.cleanupConnection(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
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
        console.log('Unknown message type:', message.type);
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

    console.log(`📞 Call started: ${callId} (${from} → ${to})`);
    
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
      console.error('Call not found:', callId);
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
      console.log(`🎤 Processing audio for call: ${callId}`);
      
      // 1. Speech to Text
      const userText = await sttService.transcribeAudio(call.audioBuffer);
      console.log(`User said: ${userText}`);

      // 2. AI Response
      const aiReply = await geminiService.generateReply(call.sessionId, userText);
      console.log(`AI replied: ${aiReply}`);

      // 3. Text to Speech
      const audioResponse = await ttsService.synthesizeSpeech(aiReply, 'ur');

      // 4. Send back to Yeastar
      call.ws.send(JSON.stringify({
        type: 'audio_response',
        callId,
        audio: audioResponse.toString('base64')
      }));

    } catch (error) {
      console.error('Audio processing error:', error);
      
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
    console.log(`📞 Call ended: ${callId}`);
    
    this.activeCalls.delete(callId);
  }

  cleanupConnection(ws) {
    // Remove all calls associated with this WebSocket
    for (const [callId, call] of this.activeCalls.entries()) {
      if (call.ws === ws) {
        this.activeCalls.delete(callId);
        console.log(`🧹 Cleaned up call: ${callId}`);
      }
    }
  }
}

module.exports = new YeastarWebSocketService();