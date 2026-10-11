const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
    {
        gig: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Gig',
            required: true,
            immutable: true
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

        agreedPriceCents: {
            type: Number,
            required: true,
            min: 100,
            max: 100000000,
            immutable: true
        },

        status: {
            type: String,
            enum: [
                'pending',
                'accepted',
                'completed',
                'cancelled'
            ],
            default: 'pending'
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

//Efficiently retrieve each user's bookings
bookingSchema.index({ client: 1, createdAt: -1 });
bookingSchema.index({ freelancer: 1, createdAt: - 1});
bookingSchema.index({ gig: 1});

module.exports = mongoose.model('Booking', bookingSchema);