const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const { validateRegisterInput, validateLoginInput } = require('../middleware/validateAuthInput');
const { protect } = require('../middleware/protect');

router.post('/register', validateRegisterInput, register);
router.post('/login', validateLoginInput, login);
router.get('/me', protect, getProfile);

module.exports = router;