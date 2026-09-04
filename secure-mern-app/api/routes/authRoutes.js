const express = require('express');
const router = express.Router();
const { register, getProfile } = require('../controllers/authController');
const { validateRegisterInput } = require('../middleware/validateAuthInput');

router.post('/register', validateRegisterInput, register);

// Luis wire JWT authentication token here: router.get('/me', protect, getProfile)
router.get('/me', getProfile);

module.exports = router;