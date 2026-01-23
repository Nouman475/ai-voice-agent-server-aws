require("dotenv").config();
const express = require("express");
const callRoutes = require("./routes/call.routes");
const yeastarRoutes = require("./routes/yeastar.routes");
const errorMiddleware = require("./middlewares/error.middleware");
const websocketService = require('./services/websocket.service');
const logger = require('./utils/logger');

const app = express();

app.use(express.json());

app.use("/api/call", callRoutes);
app.use("/api/yeastar", yeastarRoutes);

app.get("/", (req, res) => {
  const wsStatus = websocketService.getStatus();
  res.json({
    status: "✅ Yeastar AI Voice Assistant is live",
    version: "1.0.0",
    endpoints: {
      call: "/api/call",
      yeastar: "/api/yeastar",
      websocket: `ws://localhost:${process.env.WEBSOCKET_PORT || 4001}`,
      status: "/api/status"
    },
    websocket: wsStatus,
    timestamp: new Date().toISOString()
  });
});

// Add WebSocket status endpoint
app.get("/api/status", (req, res) => {
  const wsStatus = websocketService.getStatus();
  res.json({
    server: "Yeastar AI Voice Assistant",
    websocket: wsStatus,
    environment: {
      port: process.env.PORT || 4000,
      websocketPort: process.env.WEBSOCKET_PORT || 4001,
      nodeEnv: process.env.NODE_ENV || 'development'
    },
    timestamp: new Date().toISOString()
  });
});

app.use(errorMiddleware);

// Start WebSocket server for real-time audio
const wsPort = process.env.WEBSOCKET_PORT || 4001;
websocketService.start(wsPort);

logger.info(`🚀 Starting Yeastar AI Voice Assistant`);
logger.info(`📡 WebSocket Server: ws://localhost:${wsPort}`);
logger.info(`🌐 HTTP Server will start on port ${process.env.PORT || 4000}`);

module.exports = app;
