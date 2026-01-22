const {
  createSession,
  getSession,
  endSession,
} = require("../services/call-session.service");
const { askGemini } = require("./ai.controller");
const sttService = require("../services/stt.service");
const geminiService = require("../services/gemini.service");
const ttsService = require("../services/tts.service");
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.startCall = (req, res) => {
  const sessionId = createSession();
  res.json({
    sessionId,
    message: "Hello, how can I help you today?",
  });
};

exports.handleUserMessage = async (req, res, next) => {
  try {
    const { sessionId, text } = req.body;
    const session = getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.turns >= process.env.MAX_CALL_TURNS) {
      return res.json({ message: "Thank you. Goodbye." });
    }

    const reply = await askGemini(text);
    session.turns++;

    res.json({ reply });
  } catch (err) {
    next(err);
  }
};

exports.endCall = (req, res) => {
  const { sessionId } = req.body;
  endSession(sessionId);
  res.json({ message: "Call ended successfully" });
};

exports.handleAudio = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const audioBuffer = req.file?.buffer;

    if (!audioBuffer) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required" });
    }

    console.log(`Processing audio for session: ${sessionId}, size: ${audioBuffer.length} bytes`);

    // 1. Convert speech to text
    const userText = await sttService.transcribeAudio(audioBuffer);
    console.log(`User said: ${userText}`);

    // 2. Get AI response
    const aiReply = await geminiService.generateReply(sessionId, userText);
    console.log(`AI replied: ${aiReply}`);

    // 3. Convert AI text to speech
    const audioResponse = await ttsService.synthesizeSpeech(aiReply);

    // 4. Send audio back to Yeastar
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioResponse.length,
    });
    res.send(audioResponse);
  } catch (error) {
    console.error("Audio processing error:", error.message);
    res.status(500).json({ 
      error: "Audio processing failed",
      details: error.message 
    });
  }
};

exports.listModels = async (req, res) => {
  try {
    const axios = require('axios');
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );
    res.json({ models: response.data.models.map(m => ({ name: m.name, supportedMethods: m.supportedGenerationMethods })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
