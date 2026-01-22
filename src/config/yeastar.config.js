module.exports = {
  pbxUrl: process.env.YEASTAR_PBX_URL,
  apiUsername: process.env.YEASTAR_API_USER,
  apiPassword: process.env.YEASTAR_API_PASSWORD,
  apiSecret: process.env.YEASTAR_API_SECRET,
  
  baseIVR: '6500',
  responseIVRs: ['6501', '6502', '6503', '6504', '6505'],
  
  promptPath: '/ysdisk/ysapps/pbxcenter/var/lib/asterisk/sounds/custom/',
  sftpPort: 22,
  sftpUser: 'support',
  sftpPassword: process.env.YEASTAR_SFTP_PASSWORD,
};
