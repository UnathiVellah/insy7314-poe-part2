const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
    {
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
            required: true,
            immutable: true,
            unique: true
        },

        client: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true
        },

        freelancer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true
        },

        amountCents: {
            type: Number,
            required: true,
            min: 100,
            max: 100000000,
            immutable: true
        },

        status: {
            type: String,
            enum: ['succeeded'],
            required: true,
            default: 'succeeded',
            immutable: true
        },

        paymentMethod: {
            type: String,
            enum: ['simulated'],
            required: true,
            default: 'simulated',
            immutable: true
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

transactionSchema.index({ client: 1, createdAt: -1 });
transactionSchema.index({ freelancer: 1, createdAt: -1 });

module.exports = mongoose.model(
    'Transaction',
    transactionSchema
);