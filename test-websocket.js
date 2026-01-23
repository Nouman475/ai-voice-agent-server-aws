const WebSocket = require('ws');

// Test WebSocket connection
const wsUrl = 'ws://localhost:4001';
console.log(`🔗 Connecting to WebSocket: ${wsUrl}`);

const ws = new WebSocket(wsUrl);

ws.on('open', function open() {
  console.log('✅ WebSocket Connected Successfully!');
  
  // Send a test ping
  const pingMessage = {
    type: 'ping',
    timestamp: new Date().toISOString()
  };
  
  console.log('📤 Sending ping message:', JSON.stringify(pingMessage));
  ws.send(JSON.stringify(pingMessage));
  
  // Send a test call start
  setTimeout(() => {
    const callStartMessage = {
      type: 'call_start',
      callId: 'test-call-123',
      from: '201',
      to: '208',
      timestamp: new Date().toISOString()
    };
    
    console.log('📤 Sending call start message:', JSON.stringify(callStartMessage));
    ws.send(JSON.stringify(callStartMessage));
  }, 2000);
  
  // Send test call end after 10 seconds
  setTimeout(() => {
    const callEndMessage = {
      type: 'call_end',
      callId: 'test-call-123',
      timestamp: new Date().toISOString()
    };
    
    console.log('📤 Sending call end message:', JSON.stringify(callEndMessage));
    ws.send(JSON.stringify(callEndMessage));
    
    // Close connection after 2 more seconds
    setTimeout(() => {
      console.log('🔌 Closing WebSocket connection');
      ws.close();
    }, 2000);
  }, 10000);
});

ws.on('message', function message(data) {
  console.log('📥 Received message:', data.toString());
  try {
    const parsed = JSON.parse(data.toString());
    console.log('📥 Parsed message:', JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log('📥 Could not parse as JSON');
  }
});

ws.on('close', function close(code, reason) {
  console.log(`🔌 WebSocket closed - Code: ${code}, Reason: ${reason}`);
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n👋 Closing WebSocket test client...');
  ws.close();
  process.exit(0);
});