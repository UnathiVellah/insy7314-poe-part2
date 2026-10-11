const express = require('express');
const router = express.Router();

const {
    createGig,
    getGigs,
    getMyGigs,
    getGigById,
    updateGig,
    deleteGig

} = require('../controllers/gigController');
const { protect } = require('../middleware/protect');
const { authorize } = require('../middleware/authorize');
const { ROLES } = require('../config/roles');

// Reuses the same RBAC gate adminRoutes.js uses, rather than a one-off
// role check - keeps a single, already-reviewed source of truth for "is
// this user allowed to do this" across the whole API (also returns 401
// instead of crashing if req.user somehow isn't set, which the previous
// inline check didn't guard against).
const freelancerOnly = authorize(ROLES.FREELANCER);

// Public browsing
router.get('/', getGigs);



//Authenticated freelancer endpoints
router.get('/mine', protect, freelancerOnly, getMyGigs);
router.post('/', protect, freelancerOnly, createGig);

//Public single-gig details
router.get('/:id', getGigById);

//Freelancer restricted modifications
router.put('/:id', protect, freelancerOnly, updateGig);
router.delete('/:id', protect, freelancerOnly, deleteGig);

module.exports = router;


