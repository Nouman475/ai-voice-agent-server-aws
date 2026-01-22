const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { whisperConfig } = require('../config/stt.config');

async function transcribeAudio(audioBuffer) {
  try {
    // Create temporary file for Whisper processing
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, `audio_${Date.now()}.wav`);
    
    // Write audio buffer to temporary file
    fs.writeFileSync(tempFilePath, audioBuffer);
    
    // Check if Whisper executable exists
    const whisperExe = process.platform === 'win32' ? 'whisper.exe' : 'whisper';
    const whisperPath = path.join(__dirname, '../../bin', whisperExe);
    
    if (!fs.existsSync(whisperPath)) {
      // Fallback to system whisper or use a simple mock for now
      console.log('Whisper executable not found, using mock transcription');
      fs.unlinkSync(tempFilePath);
      return 'Hello, this is a mock transcription. Please install Whisper.cpp.';
    }
    
    // Run Whisper transcription
    const transcript = await runWhisper(whisperPath, tempFilePath);
    
    // Clean up temporary file
    fs.unlinkSync(tempFilePath);
    
    if (!transcript || transcript.trim() === '') {
      throw new Error('No speech detected in audio');
    }
    
    console.log(`STT Result: ${transcript}`);
    return transcript.trim();
  } catch (error) {
    console.error('STT Error:', error.message);
    throw new Error(`Speech recognition failed: ${error.message}`);
  }
}

function runWhisper(whisperPath, audioPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-m', whisperConfig.modelPath,
      '-f', audioPath,
      '--output-txt'
    ];
    
    if (whisperConfig.language !== 'auto') {
      args.push('-l', whisperConfig.language);
    }
    
    const whisper = spawn(whisperPath, args);
    let output = '';
    let error = '';
    
    whisper.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    whisper.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    whisper.on('close', (code) => {
      if (code === 0) {
        // Extract transcript from output
        const lines = output.split('\n');
        const transcript = lines.find(line => line.trim() && !line.includes('['));
        resolve(transcript || '');
      } else {
        reject(new Error(`Whisper process failed: ${error}`));
      }
    });
    
    whisper.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = { transcribeAudio };
