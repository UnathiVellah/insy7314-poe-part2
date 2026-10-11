const mongoose = require('mongoose');
const Gig = require('../models/Gig');

const PUBLIC_FIELDS = 
    'title description category price freelancer createdAt updatedAt';

const validateGigInput = (body, partial = false) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) 
    {
        return null;
    }

    const allowed = ['title', 'description', 'category', 'price'];
    const keys = Object.keys(body);

    if (
        keys.length === 0 ||
        keys.some(key => !allowed.includes(key)) ||
        (!partial && allowed.some(key => !keys.includes(key)))
    ) {
        return null;
    }

    const cleaned = {};

    for (const key of keys) {
        const value = body[key];

        if (key === 'price') {
            if (
                typeof value !== 'number' ||
                !Number.isFinite(value) ||
                value < 1 ||
                value > 1000000 ||
                !Number.isInteger(value * 100)
            ) {
                return null;
            }

            cleaned.price = value;
            continue;
        }

        if (typeof value !== 'string') {
            return null;
        }

        const text = value.trim();

        const limits = {
            title: [5, 100],
            description: [20, 2000],
            category: [1, 50]
        };

        const [min, max] = limits[key];

        if (text.length < min || text.length > max) {
            return null;
        }

        cleaned[key] = text;
    } 

    return cleaned;
};

const validId = id =>
    mongoose.isObjectIdOrHexString(id);


//POST: Create Gig
//Gig is owned by the authenticated freelancer
const createGig = async (req, res, next) => {
    try {
        const input = validateGigInput(req.body);

        if (!input) {
            return res.status(400).json({
                error: 'Invalid gig details'
            });
        }

        const gig = await Gig.create({
            ...input,
            freelancer: req.user.id
        });

        return res.status(201).json({
            message: 'Gig created sucessfully',
            data: gig
        });

    } catch (error) {
        next (error);
    }
};

//GET: /api/gigs
//View public active gig listings
const getGigs = async (req, res, next) => {
    try {
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 10);

        if (
            !Number.isSafeInteger(page) ||
            page < 1 ||
            !Number.isSafeInteger(limit) ||
            limit < 1 ||
            limit > 50 ||
            (page - 1) * limit > 100000
        ) {
            return res.status(400).json({
                error: 'Invalid pagination parameters'
            });
        }

        const filter = { isActive: true };

        const [gigs, total] = await Promise.all([
            Gig.find(filter)
                .select(PUBLIC_FIELDS)
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Gig.countDocuments(filter)
        ]);

        return res.status(200).json({
            data: gigs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// GET: /api/gigs/mine
//Freelancers can view their own gigs including inactive gigs
const getMyGigs = async (req, res, next) => {
    try {
        const gigs = await Gig.find({
            freelancer: req.user.id
        })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            data: gigs
        });
    } catch (error) {
        next(error);
    }
};

// GET: /api/gigs/:id
//Public details of one active gig listing
const getGigById = async (req, res, next) => {
    try {
        if (!validId(req.params.id)) {
            return res.status(400).json({
                error: 'Invalid gig ID'
            });
        }

        const gig = await Gig.findOne({
            _id: req.params.id,
            isActive: true
        })
            .select(PUBLIC_FIELDS)
            .lean();

        if (!gig) {
            return res.status(404).json({
                error: 'Gig not found'
            });
        }

        return res.status(200).json({
            data: gig
        });
    } catch (error) {
        next(error);
    }
};

// PUT: /api/gigs/:id
//Freelancers can edit their own gigs
const updateGig = async (req, res, next) => {
    try {
        if (!validId(req.params.id)) {
            return res.status(400).json({
                error: 'Invalid gig ID'
            });
        }

        const input = validateGigInput(req.body, true);

        if (!input) {
            return res.status(400).json({
                error: 'Invalid gig update'
            });
        }

        const gig = await Gig.findOneAndUpdate(
            {
                _id: req.params.id,
                freelancer: req.user.id,
                isActive: true
            },
            { $set: input },
            {
                new: true,
                runValidators: true
            }
        );

        if (!gig) {
            return res.status(404).json({
                error: 'Gig not found'
            });
        }

        return res.status(200).json({
            message: 'Gig updated successfully',
            data: gig
        });
    } catch (error) {
        next(error);
    }
};

// DELETE: /api/gigs/:id
// Freelancers can safely delete their gigs
const deleteGig = async (req, res, next) => {
    try {
        if (!validId(req.params.id)) {
            return res.status(400).json({
                error: 'Invalid gig ID'
            });
        }

        const gig = await Gig.findOneAndUpdate(
            {
                _id: req.params.id,
                freelancer: req.user.id,
                isActive: true
            },
            { $set: { isActive: false } },
            {
                new: true,
                runValidators: true
            }
        );

        if (!gig) {
            return res.status(404).json({
                error: 'Gig not found'
            });
        }

        return res.status(200).json({
            message: 'Gig deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createGig,
    getGigs,
    getMyGigs,
    getGigById,
    updateGig,
    deleteGig
};