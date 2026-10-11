const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const { validateRegisterInput, validateLoginInput } = require('../middleware/validateAuthInput');
const { protect } = require('../middleware/protect');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiters');

// Rate limiter runs first so a request that's already over the limit never
// reaches validation or the database.
router.post('/register', registerLimiter, validateRegisterInput, register);
router.post('/login', loginLimiter, validateLoginInput, login);
router.get('/me', protect, getProfile);

module.exports = router;