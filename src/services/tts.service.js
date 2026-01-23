// Text-to-Speech service using gTTS (FREE)
const gtts = require('gtts');
const fs = require('fs');
const path = require('path');

async function synthesizeSpeech(text, language = 'ur') {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error("No text provided for synthesis");
    }

    return new Promise((resolve, reject) => {
      const tts = new gtts(text, language);
      const tempFile = path.join(__dirname, '../../audio', `temp_${Date.now()}.mp3`);
      
      tts.save(tempFile, (err) => {
        if (err) {
          reject(new Error(`Text-to-speech failed: ${err.message}`));
        } else {
          try {
            const audioBuffer = fs.readFileSync(tempFile);
            fs.unlinkSync(tempFile); // Clean up temp file
            resolve(audioBuffer);
          } catch (fileError) {
            reject(new Error(`File processing failed: ${fileError.message}`));
          }
        }
      });
    });
  } catch (error) {
    throw error;
  }
}

module.exports = { synthesizeSpeech };
