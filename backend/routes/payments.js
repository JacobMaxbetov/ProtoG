const express = require('express');
const router = express.Router();
const { createDeposit, checkPaymentStatus, handleWebhook } = require('../controllers/paymentController');
const auth = require('../middleware/auth');

router.post('/deposit', auth, createDeposit);
router.get('/status/:paymentId', auth, checkPaymentStatus);
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

module.exports = router;