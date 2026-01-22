require("dotenv").config();
const express = require("express");
const callRoutes = require("./routes/call.routes");
const yeastarRoutes = require("./routes/yeastar.routes");
const errorMiddleware = require("./middlewares/error.middleware");
const websocketService = require('./services/websocket.service');

const app = express();

app.use(express.json());

app.use("/api/call", callRoutes);
app.use("/api/yeastar", yeastarRoutes);

app.get("/", (req, res) => {
  res.json({
    status: "✅ Yeastar AI Voice Assistant is live",
    version: "1.0.0",
    endpoints: {
      call: "/api/call",
      yeastar: "/api/yeastar",
      websocket: `ws://localhost:${process.env.WEBSOCKET_PORT || 4001}`
    },
    timestamp: new Date().toISOString()
  });
});

app.use(errorMiddleware);

// Start WebSocket server for real-time audio
websocketService.start(process.env.WEBSOCKET_PORT || 4001);

module.exports = app;
