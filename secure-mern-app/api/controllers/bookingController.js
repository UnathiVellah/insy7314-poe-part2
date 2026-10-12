const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Gig = require('../models/Gig');
const Transaction = require('../models/Transaction');

const validId = id => mongoose.isObjectIdOrHexString(id);

// POST: /api/bookings
//Clients create a booking of a gig
const createBooking = async (req, res, next) => {
    try {
        const { gigId } = req.body || {};

        if (
            !req.body ||
            typeof req.body !== 'object' ||
            Array.isArray(req.body) ||
            Object.keys(req.body).length !== 1 ||
            !validId(gigId)
        ) {
            return res.status(400).json({
                error: 'A valid gigId is required'
            });
        }

        let booking;

        await mongoose.connection.transaction(async session => {
            const gig = await Gig.findOne({
                _id: gigId,
                isActive: true
            }).session(session);

            if (!gig) {
                const error = new Error('Gig not found or unavailable');
                error.statusCode = 404;
                throw error;
            }

            if (String(gig.freelancer) === String(req.user.id)) {
                const error = new Error('Cannot book your own gig');
                error.statusCode = 403;
                throw error;
            }

            const agreedPriceCents = Math.round(gig.price * 100);

            const bookings = await Booking.create(
                [{
                    gig: gig._id,
                    client: req.user.id,
                    freelancer: gig.freelancer,
                    agreedPriceCents,
                    status: 'pending'
                }],
                { session }
            );

            booking = bookings[0];

            await Transaction.create(
                [{
                    booking: booking._id,
                    client: booking.client,
                    freelancer: booking.freelancer,
                    amountCents: booking.agreedPriceCents,
                    status: 'pending',
                    paymentMethod: 'simulated'
                }],
                { session }
            );
        });

        return res.status(201).json({
            message: 'Booking created successfully',
            data: booking
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                error: error.message
            });
        }

        next(error);
    }
};

// GET: /api/bookings/mine
//Clients can view their own bookings
const getMyBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find({
            client: req.user.id
        })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            data: bookings
        });
    } catch (error) {
        next(error);
    }
};

// GET: /api/bookings/freelancer
//Freelancers can view bookings for their gigs
const getFreelancerBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find({
            freelancer: req.user.id
        })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            data: bookings
        });
    } catch (error) {
        next(error);
    }
};

// GET: /api/bookings/:id
//Authorised participants can view the bookimng details
const getBookingById = async (req, res, next) => {
    try {
        if (!validId(req.params.id)) {
            return res.status(400).json({
                error: 'Invalid booking ID'
            });
        }

        const booking = await Booking.findOne({
            _id: req.params.id,
            $or: [
                { client: req.user.id },
                { freelancer: req.user.id }
            ]
        }).lean();

        if (!booking) {
            return res.status(404).json({
                error: 'Booking not found'
            });
        }

        return res.status(200).json({
            data: booking
        });
    } catch (error) {
        next(error);
    }
};

// PATCH: /api/bookings/:id/status
//Change booking status
const updateBookingStatus = async (req, res, next) => {
    try {
        if (!validId(req.params.id)) {
            return res.status(400).json({
                error: 'Invalid booking ID'
            });
        }

        const { status } = req.body || {};

        if (
            !req.body ||
            typeof req.body !== 'object' ||
            Array.isArray(req.body) ||
            Object.keys(req.body).length !== 1 ||
            typeof status !== 'string'
        ) {
            return res.status(400).json({
                error: 'Invalid status update'
            });
        }

        const transitions = {
            accepted: {
                from: 'pending',
                actor: 'freelancer'
            },
            completed: {
                from: 'accepted',
                actor: 'freelancer'
            },
            cancelled: {
                from: 'pending',
                actor: 'client'
            }
        };

        const transition = transitions[status];

        if (!transition) {
            return res.status(400).json({
                error: 'Invalid status transition'
            });
        }

        const ownerField = transition.actor;
        let booking;

        if (status === 'cancelled') {
            await mongoose.connection.transaction(async session => {
                booking = await Booking.findOneAndUpdate(
                    {
                        _id: req.params.id,
                        [ownerField]: req.user.id,
                        status: transition.from
                    },
                    { $set: { status } },
                    {
                        new: true,
                        runValidators: true,
                        session
                    }
                );

                if (!booking) {
                    return;
                }

                const transaction = await Transaction.findOneAndUpdate(
                    {
                        booking: booking._id,
                        client: req.user.id,
                        status: 'pending'
                    },
                    { $set: { status: 'cancelled' } },
                    {
                        new: true,
                        runValidators: true,
                        session
                    }
                );

                if (!transaction) {
                    throw new Error(
                        'Pending transaction missing for cancelled booking'
                    );
                }
            });
        } else {
            booking = await Booking.findOneAndUpdate(
                {
                    _id: req.params.id,
                    [ownerField]: req.user.id,
                    status: transition.from
                },
                { $set: { status } },
                {
                    new: true,
                    runValidators: true
                }
            );
        }

        if (!booking) {
            return res.status(404).json({
                error: 'Booking not found or transition not permitted'
            });
        }

        return res.status(200).json({
            message: 'Booking status updated successfully',
            data: booking
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createBooking,
    getMyBookings,
    getFreelancerBookings,
    getBookingById,
    updateBookingStatus
};