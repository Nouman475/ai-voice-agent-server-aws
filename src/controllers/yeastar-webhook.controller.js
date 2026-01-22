const ivrManager = require("../services/ivr-manager.service");
const sessionService = require("../services/call-session.service");

const dtmfMapping = {
  1: "Option 1",
  2: "Option 2",
  3: "Option 3",
  4: "Option 4",
  5: "Option 5",
  9: "Main menu",
  "*": "Repeat",
  "#": "Confirm",
};

exports.handleIncomingCall = async (req, res) => {
  try {
    let callid, callerid, calledNumber;

    if (req.body.msg) {
      const decodedMsg = req.body.msg.replace(/"/g, '"').replace(/'/g, "'");

      const msgData = JSON.parse(decodedMsg);
      callid = msgData.call_id;
      callerid = msgData.call_from || msgData.extension;
      calledNumber = msgData.call_to || msgData.called_number;
    } else {
      callid = req.body.callid || req.body.call_id;
      callerid = req.body.callerid || req.body.from;
      calledNumber = req.body.called_number || req.body.call_to || req.body.to;
    }

    console.log(`📞 Incoming call: ${callerid} → ${calledNumber} (Call ID: ${callid})`);

    if (callid) {
      // Check if session already exists
      const existingSession = sessionService.getSessionByCallId(callid);

      if (!existingSession) {
        const sessionId = sessionService.createSession();
        sessionService.mapCallToSession(callid, sessionId);
        console.log(`New call: ${callid} → Session: ${sessionId}`);
        
        // Check if call is to extension 208 (IVR) - Direct AI answer
        if (calledNumber === '208' || req.body.type === 'ivr_input') {
          console.log(`🤖 Extension 208 IVR called - Starting AI conversation`);
          
          // Start AI conversation immediately for IVR
          try {
            const result = await ivrManager.processUserInput(sessionId, "IVR_CALL_START", callid);
            console.log(`✅ AI ready for extension 208 IVR`);
          } catch (aiError) {
            console.error("AI initialization failed:", aiError.message);
          }
        }
      } else {
        console.log(
          `Call already exists: ${callid} → Session: ${existingSession}`,
        );
      }
    }

    res.json({ status: "success" });
  } catch (error) {
    console.error("Incoming call error:", error);
    res.status(500).json({ error: "Internal error" });
  }
};

exports.handleCallEnd = async (req, res) => {
  try {
    let callid;

    if (req.body.msg) {
      const decodedMsg = req.body.msg.replace(/"/g, '"').replace(/'/g, "'");

      const msgData = JSON.parse(decodedMsg);
      callid = msgData.call_id;
    } else {
      callid = req.body.callid;
    }

    if (callid) {
      const sessionId = sessionService.getSessionByCallId(callid);

      if (sessionId) {
        sessionService.endSession(sessionId);
        console.log(`Call ended: ${callid}`);
      }
    }

    res.json({ status: "success" });
  } catch (error) {
    console.error("Call end error:", error);
    res.status(500).json({ error: "Internal error" });
  }
};

exports.handleDTMF = async (req, res) => {
  try {
    console.log("🔥 DTMF WEBHOOK DATA:", req.body);

    // Parse Yeastar webhook format
    let callid, dtmf;

    if (req.body.msg) {
      const decodedMsg = req.body.msg.replace(/"/g, '"').replace(/'/g, "'");

      const msgData = JSON.parse(decodedMsg);
      callid = msgData.call_id;
      dtmf = msgData.info;

      console.log("📞 Parsed DTMF:", { callid, dtmf, type: req.body.type });
    } else {
      callid = req.body.callid;
      dtmf = req.body.dtmf;
    }

    if (!callid || !dtmf) {
      return res.json({ status: "ignored", reason: "No DTMF data" });
    }

    const sessionId = sessionService.getSessionByCallId(callid);

    if (!sessionId) {
      return res.status(404).json({ error: "Session not found" });
    }

    console.log(`DTMF received: ${dtmf} for call ${callid}`);

    const userInput = dtmfMapping[dtmf] || dtmf;

    // 🔥 ENABLE IVR PROCESSING
    try {
      console.log(`🤖 Processing AI response for: ${userInput}`);
      const result = await ivrManager.processUserInput(
        sessionId,
        userInput,
        callid,
      );
      console.log(`✅ AI Response: ${result.aiResponse}`);
      console.log(`📞 Transferred to IVR: ${result.ivr}`);
    } catch (ivrError) {
      console.error("IVR processing failed:", ivrError.message);
      // Continue even if IVR fails
    }

    console.log(`Processed DTMF: ${userInput}`);

    res.json({ status: "success", dtmf: userInput });
  } catch (error) {
    console.error("DTMF handling error:", error);
    res.status(500).json({ error: "Internal error" });
  }
};

exports.handleCallEnd = async (req, res) => {
  try {
    const { callid } = req.body;

    const sessionId = sessionService.getSessionByCallId(callid);

    if (sessionId) {
      sessionService.endSession(sessionId);
      console.log(`Call ended: ${callid}`);
    }

    res.json({ status: "success" });
  } catch (error) {
    console.error("Call end error:", error);
    res.status(500).json({ error: "Internal error" });
  }
};
