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
          console.error('TTS Error:', err);
          reject(new Error(`Text-to-speech failed: ${err.message}`));
        } else {
          try {
            const audioBuffer = fs.readFileSync(tempFile);
            fs.unlinkSync(tempFile); // Clean up temp file
            console.log(`TTS Success: Generated ${audioBuffer.length} bytes`);
            resolve(audioBuffer);
          } catch (fileError) {
            console.error('File operation error:', fileError);
            reject(new Error(`File processing failed: ${fileError.message}`));
          }
        }
      });
    });
  } catch (error) {
    console.error('TTS Service Error:', error.message);
    throw error;
  }
}

module.exports = { synthesizeSpeech };
