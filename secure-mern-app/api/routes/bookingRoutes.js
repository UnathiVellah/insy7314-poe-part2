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
const { authorize } = require('../middleware/authorize');
const { ROLES } = require('../config/roles');

router.use(protect);

router.post('/', authorize(ROLES.CLIENT), bookingLimiter, createBooking);

router.get('/mine', authorize(ROLES.CLIENT), getMyBookings);

router.get('/freelancer', authorize(ROLES.FREELANCER), getFreelancerBookings);

router.get('/:id', getBookingById);

router.patch('/:id/status', updateBookingStatus);

module.exports = router;