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

    if (callid) {
      // Check if session already exists
      const existingSession = sessionService.getSessionByCallId(callid);

      if (!existingSession) {
        const sessionId = sessionService.createSession();
        sessionService.mapCallToSession(callid, sessionId);
        
        // Check if call is to extension 208 (IVR) - Direct AI answer
        if (calledNumber === '208' || req.body.type === 'ivr_input') {
          try {
            const result = await ivrManager.processUserInput(sessionId, "IVR_CALL_START", callid);
          } catch (aiError) {
            // Silent error handling
          }
        }
      }
    }

    res.json({ status: "success" });
  } catch (error) {
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
      }
    }

    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Internal error" });
  }
};

exports.handleDTMF = async (req, res) => {
  try {
    // Parse Yeastar webhook format
    let callid, dtmf;

    if (req.body.msg) {
      const decodedMsg = req.body.msg.replace(/"/g, '"').replace(/'/g, "'");

      const msgData = JSON.parse(decodedMsg);
      callid = msgData.call_id;
      dtmf = msgData.info;
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

    const userInput = dtmfMapping[dtmf] || dtmf;

    // Process DTMF silently
    try {
      const result = await ivrManager.processUserInput(
        sessionId,
        userInput,
        callid,
      );
    } catch (ivrError) {
      // Silent error handling
    }

    res.json({ status: "success", dtmf: userInput });
  } catch (error) {
    res.status(500).json({ error: "Internal error" });
  }
};

exports.handleCallEnd = async (req, res) => {
  try {
    const { callid } = req.body;

    const sessionId = sessionService.getSessionByCallId(callid);

    if (sessionId) {
      sessionService.endSession(sessionId);
    }

    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Internal error" });
  }
};
