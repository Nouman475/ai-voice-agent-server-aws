const WebSocket = require('ws');
const sttService = require('./stt.service');
const geminiService = require('./gemini.service');
const ttsService = require('./tts.service');
const { createSession, getSession } = require('./call-session.service');
const logger = require('../utils/logger');

class YeastarWebSocketService {
  constructor() {
    this.wss = null;
    this.activeCalls = new Map(); // callId -> { ws, sessionId, audioBuffer }
  }

  start(port = 4000) {
    this.wss = new WebSocket.Server({ 
      port,
      perMessageDeflate: false,
      maxPayload: 1024 * 1024 * 10 // 10MB max payload
    });
    
    logger.websocket(`🎧 Voice WebSocket Server running on ws://localhost:${port}`);
    logger.websocket(`🔧 WebSocket Server Configuration: Port=${port}, MaxPayload=10MB`);
    
    this.wss.on('connection', (ws, req) => {
      const clientIP = req.socket.remoteAddress;
      logger.websocket(`🔗 NEW WebSocket Connection from IP: ${clientIP}`);
      logger.websocket(`🔗 Connection Headers: ${JSON.stringify(req.headers)}`);
      
      ws.on('message', async (data) => {
        try {
          logger.websocket(`📡 Raw WebSocket Data Received (${data.length} bytes)`);
          logger.websocket(`📡 Data Preview: ${data.toString().substring(0, 200)}...`);
          await this.handleMessage(ws, data);
        } catch (error) {
          logger.error('WebSocket message handling error:', error);
          ws.send(JSON.stringify({ error: error.message }));
        }
      });

      ws.on('close', (code, reason) => {
        logger.websocket(`🔌 WebSocket disconnected - Code: ${code}, Reason: ${reason}`);
        this.cleanupConnection(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket connection error:', error);
      });
      
      // Send connection confirmation
      const confirmationMsg = {
        type: 'connection_ready',
        message: 'WebSocket connected successfully',
        timestamp: new Date().toISOString(),
        server: 'Yeastar AI Voice Assistant'
      };
      
      ws.send(JSON.stringify(confirmationMsg));
      logger.websocket(`✅ Connection confirmation sent: ${JSON.stringify(confirmationMsg)}`);
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket Server error:', error);
    });

    // Log server stats every 30 seconds
    setInterval(() => {
      logger.websocket(`📊 Server Stats - Active Connections: ${this.wss.clients.size}, Active Calls: ${this.activeCalls.size}`);
    }, 30000);
  }

  async handleMessage(ws, data) {
    try {
      // Parse Yeastar message
      const message = JSON.parse(data.toString());
      logger.websocket(`📨 Message Type: ${message.type}`);
      logger.websocket(`📨 Full Message: ${JSON.stringify(message)}`);
      
      switch (message.type) {
        case 'call_start':
          await this.handleCallStart(ws, message);
          break;
        case 'audio_data':
          logger.websocket(`🎵 Audio Data Received - Size: ${message.audio ? message.audio.length : 0} chars`);
          await this.handleAudioData(ws, message);
          break;
        case 'call_end':
          await this.handleCallEnd(ws, message);
          break;
        case 'ping':
          logger.websocket('🏓 Ping received, sending pong');
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
        default:
          logger.websocket(`❓ Unknown message type: ${message.type}`);
          break;
      }
    } catch (parseError) {
      logger.error('Failed to parse WebSocket message:', parseError);
      logger.websocket(`📨 Raw data that failed to parse: ${data.toString()}`);
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
      to,
      startTime: new Date()
    });

    logger.websocket(`📞 Call Started - ID: ${callId}, From: ${from}, To: ${to}, Session: ${sessionId}`);
    
    // Send welcome message
    const welcomeText = "آپ کا خیر مقدم ہے، میں آپ کی کیسے مدد کر سکتا ہوں؟";
    const welcomeAudio = await ttsService.synthesizeSpeech(welcomeText, 'ur');
    
    const response = {
      type: 'audio_response',
      callId,
      audio: welcomeAudio.toString('base64'),
      timestamp: new Date().toISOString()
    };
    
    ws.send(JSON.stringify(response));
    logger.websocket(`🎤 Welcome message sent for call ${callId}`);
  }

  async handleAudioData(ws, message) {
    const { callId, audio } = message;
    const call = this.activeCalls.get(callId);
    
    if (!call) {
      logger.websocket(`❌ No active call found for ID: ${callId}`);
      return;
    }

    // Accumulate audio data
    const audioChunk = Buffer.from(audio, 'base64');
    call.audioBuffer = Buffer.concat([call.audioBuffer, audioChunk]);
    logger.websocket(`🎤 Audio Buffer Updated - Call: ${callId}, Total: ${call.audioBuffer.length} bytes`);

    // Process when we have enough audio (e.g., 3 seconds at 8kHz)
    const minAudioSize = 8000 * 2 * 3; // 3 seconds of 16-bit audio at 8kHz
    
    if (call.audioBuffer.length >= minAudioSize) {
      logger.websocket(`⚡ Processing audio chunk for call ${callId} (${call.audioBuffer.length} bytes)`);
      await this.processAudio(call, callId);
      call.audioBuffer = Buffer.alloc(0); // Reset buffer
    }
  }

  async processAudio(call, callId) {
    try {
      logger.websocket(`🔄 Starting audio processing for call ${callId}`);
      
      // 1. Speech to Text
      logger.websocket(`🎤 Starting STT for call ${callId}`);
      const userText = await sttService.transcribeAudio(call.audioBuffer);
      logger.websocket(`🎤 STT Result for call ${callId}: "${userText}"`);

      // 2. AI Response
      logger.websocket(`🤖 Generating AI response for call ${callId}`);
      const aiReply = await geminiService.generateReply(call.sessionId, userText);
      logger.websocket(`🤖 AI Response for call ${callId}: "${aiReply}"`);

      // 3. Text to Speech
      logger.websocket(`🔊 Starting TTS for call ${callId}`);
      const audioResponse = await ttsService.synthesizeSpeech(aiReply, 'ur');
      logger.websocket(`🔊 TTS completed for call ${callId} (${audioResponse.length} bytes)`);

      // 4. Send back to Yeastar
      const response = {
        type: 'audio_response',
        callId,
        audio: audioResponse.toString('base64'),
        timestamp: new Date().toISOString()
      };
      
      call.ws.send(JSON.stringify(response));
      logger.websocket(`📤 Audio response sent to Yeastar for call ${callId}`);

    } catch (error) {
      logger.error(`Audio processing error for call ${callId}:`, error);
      
      // Send error response
      const errorText = "معذرت، میں آپ کو سمجھ نہیں سکا۔ براہ کرم دوبارہ کہیں۔";
      const errorAudio = await ttsService.synthesizeSpeech(errorText, 'ur');
      
      const errorResponse = {
        type: 'audio_response',
        callId,
        audio: errorAudio.toString('base64'),
        error: true,
        timestamp: new Date().toISOString()
      };
      
      call.ws.send(JSON.stringify(errorResponse));
      logger.websocket(`📤 Error response sent for call ${callId}`);
    }
  }

  async handleCallEnd(ws, message) {
    const { callId } = message;
    const call = this.activeCalls.get(callId);
    
    if (call) {
      const duration = new Date() - call.startTime;
      logger.websocket(`📞 Call Ended - ID: ${callId}, Duration: ${Math.round(duration/1000)}s`);
    } else {
      logger.websocket(`📞 Call End received for unknown call: ${callId}`);
    }
    
    this.activeCalls.delete(callId);
  }

  cleanupConnection(ws) {
    let cleanedCalls = 0;
    // Remove all calls associated with this WebSocket
    for (const [callId, call] of this.activeCalls.entries()) {
      if (call.ws === ws) {
        this.activeCalls.delete(callId);
        cleanedCalls++;
      }
    }
    
    if (cleanedCalls > 0) {
      logger.websocket(`🧹 Cleaned up ${cleanedCalls} calls for disconnected WebSocket`);
    }
  }

  // Add method to get server status
  getStatus() {
    return {
      isRunning: this.wss !== null,
      activeConnections: this.wss ? this.wss.clients.size : 0,
      activeCalls: this.activeCalls.size,
      port: this.wss ? this.wss.options.port : null
    };
  }
}

module.exports = new YeastarWebSocketService();