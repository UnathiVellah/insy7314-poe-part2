const express = require('express');
const router = express.Router();
const { paymentLimiter } = require('../middleware/rateLimiters');

const {
    createTransaction,
    getMyTransactions,
    getFreelancerIncome,
    getTransactionById
} = require('../controllers/transactionController');

const { protect } = require('../middleware/protect');
const { authorize } = require('../middleware/authorize');
const { ROLES } = require('../config/roles');

router.use(protect);

// Client payment endpoints
router.post('/', authorize(ROLES.CLIENT), paymentLimiter, createTransaction);

router.get('/mine', authorize(ROLES.CLIENT), getMyTransactions);

// Freelancer income endpoint
router.get('/income', authorize(ROLES.FREELANCER), getFreelancerIncome);

// Authorized transaction details
router.get('/:id', getTransactionById);

module.exports = router;