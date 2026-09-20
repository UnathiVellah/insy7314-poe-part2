const express = require('express');
const router = express.Router();
const { listUsers } = require('../controllers/adminController');
const { protect } = require('../middleware/protect');
const { authorize } = require('../middleware/authorize');
const { ROLES } = require('../config/roles');

router.get('/users', protect, authorize(ROLES.ADMIN), listUsers);

module.exports = router;
