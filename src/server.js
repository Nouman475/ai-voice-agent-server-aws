const { app, server } = require("./app");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 4000;

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Voice Assistant HTTP Server running on port ${PORT}`);
  logger.info(`🌐 Access your server at: http://65.2.145.32:${PORT}`);
  logger.info(`📊 Status endpoint: http://65.2.145.32:${PORT}/api/status`);
  logger.info(`🔗 WebSocket endpoint: ws://65.2.145.32:4001`);
});