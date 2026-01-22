const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin';
const MODEL_PATH = path.join(__dirname, '../../models/ggml-base.bin');

async function downloadModel() {
  if (fs.existsSync(MODEL_PATH)) {
    console.log('Whisper model already exists');
    return;
  }

  console.log('Downloading Whisper base model...');
  
  const file = fs.createWriteStream(MODEL_PATH);
  
  return new Promise((resolve, reject) => {
    https.get(MODEL_URL, (response) => {
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      
      response.pipe(file);
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const progress = ((downloadedSize / totalSize) * 100).toFixed(2);
        process.stdout.write(`\rDownloading: ${progress}%`);
      });
      
      file.on('finish', () => {
        file.close();
        console.log('\nWhisper model downloaded successfully!');
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(MODEL_PATH, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

if (require.main === module) {
  downloadModel().catch(console.error);
}

module.exports = { downloadModel };