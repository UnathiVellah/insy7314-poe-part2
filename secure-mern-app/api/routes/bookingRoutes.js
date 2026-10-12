const express = require('express');
const router = express.Router();
const { bookingLimiter } = require('../middleware/rateLimiters');

const {
    createBooking,
    getMyBookings,
    getFreelancerBookings,
    getBookingById,
    updateBookingStatus
} = require('../controllers/bookingController');

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

router.post('/', requireRole(ROLES.CLIENT), bookingLimiter, createBooking);

router.get('/mine', requireRole(ROLES.CLIENT), getMyBookings);

router.get('/freelancer', requireRole(ROLES.FREELANCER), getFreelancerBookings);

router.get('/:id', getBookingById);

router.patch('/:id/status', updateBookingStatus);

module.exports = router;