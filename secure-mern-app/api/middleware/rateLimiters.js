const rateLimit = require('express-rate-limit');

// All limiters respond with the same { error } shape as the rest of the API
// (see docs/API_CONTRACT.md) instead of express-rate-limit's default body,
// so a 429 looks like every other error to a client.
const rateLimitHandler = (req, res) => {
    res.status(429).json({
        error: 'Too many requests. Please try again later.'
    });
};

// Login is the highest-value target for credential stuffing / brute force,
// so it gets the strictest limit. Counting only failed attempts
// (skipSuccessfulRequests) means a legitimate user who gets their password
// right on, say, the 3rd try is never penalised for their own typos.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: rateLimitHandler
});

// Registration doesn't expose a password to guess, but an unlimited endpoint
// still invites automated mass account creation / email enumeration via the
// 409 "User already exists" response.
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler
});

// Prepared for Person 2's POST /api/bookings (see docs/API_CONTRACT.md,
// which already specifies 429 on booking). Import and apply the same way
// as loginLimiter/registerLimiter below:
//
//   const { bookingLimiter } = require('../middleware/rateLimiters');
//   router.post('/', protect, authorize(ROLES.CLIENT), bookingLimiter, createBooking);
//
// Booking is a normal authenticated action rather than a credential check,
// so the limit is looser than login's - it exists to stop a single account
// from hammering the booking/payment-simulation flow, not to slow down a
// legitimate client placing one or two bookings.
const bookingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler
});

// Prevent excessive simulated payment attempts.
// Limits each IP address to 20 payment requests per 15 minutes.
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler
});

module.exports = {
    loginLimiter,
    registerLimiter,
    bookingLimiter,
    paymentLimiter
};
