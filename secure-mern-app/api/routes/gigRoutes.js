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
const { ROLES } = require('../config/roles');

const freelancerOnly = (req, res, next) => {
    if (req.user.role !== ROLES.FREELANCER) {
        return res.status(403).json({
            error: 'Access denied: freelancers only'
        });
    }

    next();
};

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


