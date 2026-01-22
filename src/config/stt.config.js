const path = require('path');

const whisperConfig = {
  modelPath: process.env.WHISPER_MODEL_PATH || path.join(__dirname, '../../models/ggml-base.bin'),
  language: process.env.WHISPER_LANGUAGE || 'auto',
  wordTimestamps: process.env.WHISPER_WORD_TIMESTAMPS === 'true' || false
};

module.exports = { whisperConfig };