const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const { parsePagination, paginationMeta } = require('../utils/pagination');

const validId = id =>
    mongoose.isObjectIdOrHexString(id);

const formatRand = cents =>
    `R${(cents / 100).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2    
    })}`;


// POST: /api/transactions
//Clients simulate payments for completed bookings
const createTransaction = async (req, res, next) => {
    try {
        const { bookingId } = req.body || {};

        if (
            !req.body ||
            typeof req.body !== 'object' ||
            Array.isArray(req.body) ||
            Object.keys(req.body).length !== 1 ||
            !validId(bookingId)
        ) {
            return res.status(400).json({
                error: 'A valid bookingId is required'
            });
        }

        const booking = await Booking.findOne({
            _id: bookingId,
            client: req.user.id,
            status: 'completed'
        }).lean();

        if (!booking) {
            return res.status(404).json({
                error: 'Completed booking not found'
            });
        }

        const transaction = await Transaction.findOneAndUpdate(
            {
                booking: booking._id,
                client: req.user.id,
                freelancer: booking.freelancer,
                amountCents: booking.agreedPriceCents,
                status: 'pending'
            },
            {
                $set: {
                    status: 'succeeded'
                }
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!transaction) {
            const existingTransaction = await Transaction.findOne({
                booking: booking._id,
                client: req.user.id
            }).lean();

            if (existingTransaction?.status === 'succeeded') {
                return res.status(409).json({
                    error: 'Booking has already been paid'
                });
            }

            return res.status(409).json({
                error: 'Booking transaction is not available for payment'
            });
        }

        return res.status(200).json({
            message: 'Simulated payment successful',
            data: {
                ...transaction.toObject(),
                amountFormatted: formatRand(transaction.amountCents)
            }
        });
    } catch (error) {
        next(error);
    }
};

// GET: /api/transactions/mine
//Clients view their own simulated payments
const getMyTransactions = async (req, res, next) => {
    try {
        const paging = parsePagination(req.query);

        if (!paging) {
            return res.status(400).json({
                error: 'Invalid pagination parameters'
            });
        }

        const filter = { client: req.user.id };

        const [transactions, total] = await Promise.all([
            Transaction.find(filter)
                .sort({ createdAt: -1, _id: -1 })
                .skip(paging.skip)
                .limit(paging.limit)
                .lean(),
            Transaction.countDocuments(filter)
        ]);

        return res.status(200).json({
            data: transactions.map(transaction => ({
                ...transaction,
                amountFormatted: formatRand(transaction.amountCents)
            })),
            pagination: paginationMeta(paging.page, paging.limit, total)
        });
    } catch (error) {
        next(error);
    }
};

// GET: /api/transactions/income
//Freelancers view their simulated earnings
const getFreelancerIncome = async (req, res, next) => {
    try {
        // The totals come from the aggregate over ALL succeeded payments, so
        // they stay exact; only the itemised list is paged.
        const paging = parsePagination(req.query);

        if (!paging) {
            return res.status(400).json({
                error: 'Invalid pagination parameters'
            });
        }

        const freelancerId = new mongoose.Types.ObjectId(
            req.user.id
        );

        const [summary, transactions] = await Promise.all([
            Transaction.aggregate([
                {
                    $match: {
                        freelancer: freelancerId,
                        status: 'succeeded'
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalIncomeCents: { $sum: '$amountCents' },
                        completedPayments: { $sum: 1 }
                    }
                }
            ]),

            Transaction.find({
                freelancer: req.user.id,
                status: 'succeeded'
            })
                .select('_id booking amountCents status createdAt')
                .sort({ createdAt: -1, _id: -1 })
                .skip(paging.skip)
                .limit(paging.limit)
                .lean()
        ]);

        const totalIncomeCents =
            summary[0]?.totalIncomeCents || 0;

        return res.status(200).json({
            data: {
                totalIncomeCents,
                totalIncomeFormatted: formatRand(totalIncomeCents),
                completedPayments:
                    summary[0]?.completedPayments || 0,
                currency: 'ZAR',
                transactions
            },
            pagination: paginationMeta(
                paging.page,
                paging.limit,
                summary[0]?.completedPayments || 0
            )
        });
    } catch (error) {
        next(error);
    }
};

// GET: /api/transactions/:id
const getTransactionById = async (req, res, next) => {
    try {
        if (!validId(req.params.id)) {
            return res.status(400).json({
                error: 'Invalid transaction ID'
            });
        }

        const transaction = await Transaction.findOne({
            _id: req.params.id,
            $or: [
                { client: req.user.id },
                { freelancer: req.user.id }
            ]
        }).lean();

        if (!transaction) {
            return res.status(404).json({
                error: 'Transaction not found'
            });
        }

        return res.status(200).json({
            data: {
                ...transaction,
                amountFormatted: formatRand(transaction.amountCents)
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createTransaction,
    getMyTransactions,
    getFreelancerIncome,
    getTransactionById
};