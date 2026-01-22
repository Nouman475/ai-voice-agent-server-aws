const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const path = require('path');
const config = require('../config/yeastar.config');

class AudioUploadService {
  async uploadAudioToYeastar(localFilePath, remoteFilename) {
    const sftp = new SftpClient();
    
    try {
      await sftp.connect({
        host: config.pbxUrl.replace('https://', '').replace('http://', ''),
        port: config.sftpPort,
        username: config.sftpUser,
        password: config.sftpPassword
      });

      const remotePath = path.join(config.promptPath, remoteFilename);
      
      await sftp.put(localFilePath, remotePath);
      
      console.log(`Audio uploaded: ${remoteFilename}`);
      
      await sftp.end();
      
      return `custom/${remoteFilename}`;
      
    } catch (error) {
      console.error('SFTP upload error:', error);
      throw error;
    }
  }
}

module.exports = new AudioUploadService();
