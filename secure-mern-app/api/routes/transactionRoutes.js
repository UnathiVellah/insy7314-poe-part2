const express = require('express');
const router = express.Router();

const {
    createTransaction,
    getMyTransactions,
    getFreelancerIncome,
    getTransactionById
} = require('../controllers/transactionController');

const { protect } = require('../middleware/protect');
const { ROLES } = require('../config/roles');

const requireRole = role => (req, res, next) => {
    if (req.user.role !== role) {
        return res.status(403).json({
            error: 'Access denied'
        });
    }

    next();
};

router.use(protect);

// Client payment endpoints
router.post('/', requireRole(ROLES.CLIENT), createTransaction);

router.get('/mine', requireRole(ROLES.CLIENT), getMyTransactions);

// Freelancer income endpoint
router.get('/income', requireRole(ROLES.FREELANCER), getFreelancerIncome);

// Authorized transaction details
router.get('/:id', getTransactionById);

module.exports = router;