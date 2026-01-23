const app = require("./app");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`🚀 Voice Assistant HTTP Server running on port ${PORT}`);
  logger.info(`🌐 Access your server at: http://localhost:${PORT}`);
  logger.info(`📊 Status endpoint: http://localhost:${PORT}/api/status`);
});