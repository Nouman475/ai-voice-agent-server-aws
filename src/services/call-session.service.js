const { v4: uuidv4 } = require("uuid");

const sessions = new Map();
const callToSession = new Map();

exports.createSession = () => {
  const id = uuidv4();
  const session = { id, turns: 0, createdAt: Date.now() };
  sessions.set(id, session);
  return id;
};

exports.getSession = (id) => sessions.get(id);

exports.endSession = (id) => sessions.delete(id);

exports.mapCallToSession = (callId, sessionId) => {
  callToSession.set(callId, sessionId);
};

exports.getSessionByCallId = (callId) => {
  return callToSession.get(callId);
};
