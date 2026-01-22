// Request validation middleware

exports.validateStartCall = (req, res, next) => {
  next();
};

exports.validateMessage = (req, res, next) => {
  const { sessionId, text } = req.body;
  
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Valid sessionId is required' });
  }
  
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Valid text message is required' });
  }
  
  next();
};

exports.validateEndCall = (req, res, next) => {
  const { sessionId } = req.body;
  
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Valid sessionId is required' });
  }
  
  next();
};

exports.validateWebhook = (req, res, next) => {
  const { callid } = req.body;
  
  if (!callid || typeof callid !== 'string') {
    return res.status(400).json({ error: 'Valid callid is required' });
  }
  
  next();
};
