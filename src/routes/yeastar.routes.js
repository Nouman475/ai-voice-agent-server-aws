const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/yeastar-webhook.controller');

router.post('/webhook/incoming', webhookController.handleIncomingCall);
router.post('/webhook/dtmf', webhookController.handleDTMF);
router.post('/webhook/callend', webhookController.handleCallEnd);

module.exports = router;
