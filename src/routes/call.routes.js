const express = require('express');
const multer = require('multer');
const router = express.Router();
const callController = require('../controllers/call.controller');
const validation = require('../middlewares/validation.middleware');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/start', validation.validateStartCall, callController.startCall);
router.post('/message', validation.validateMessage, callController.handleUserMessage);
router.post('/end', validation.validateEndCall, callController.endCall);
router.post('/audio', upload.single('audio'), callController.handleAudio);
router.get('/models', callController.listModels);

module.exports = router;
