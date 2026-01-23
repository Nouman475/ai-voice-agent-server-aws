require("dotenv").config();
const express = require("express");
const callRoutes = require("./routes/call.routes");
const yeastarRoutes = require("./routes/yeastar.routes");
const errorMiddleware = require("./middlewares/error.middleware");
const websocketService = require('./services/websocket.service');
const logger = require('./utils/logger');
const http = require('http');

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
      websocket: `ws://65.2.145.32:${process.env.WEBSOCKET_PORT || 4001}`,
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

// Add WebSocket upgrade endpoint for Yeastar compatibility
app.get('/websocket', (req, res) => {
  logger.websocket('🔄 HTTP WebSocket upgrade request received');
  res.status(426).json({
    error: 'Upgrade Required',
    message: 'This endpoint requires WebSocket upgrade',
    websocketUrl: `ws://65.2.145.32:${process.env.WEBSOCKET_PORT || 4001}`
  });
});

app.use(errorMiddleware);

// Create HTTP server for potential WebSocket upgrade
const server = http.createServer(app);

// Start WebSocket server for real-time audio
const wsPort = process.env.WEBSOCKET_PORT || 4001;
websocketService.start(wsPort);

logger.info(`🚀 Starting Yeastar AI Voice Assistant`);
logger.info(`📡 WebSocket Server: ws://65.2.145.32:${wsPort}`);
logger.info(`🌐 HTTP Server will start on port ${process.env.PORT || 4000}`);

module.exports = { app, server };
