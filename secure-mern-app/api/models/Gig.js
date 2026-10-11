const mongoose = require ('mongoose');

const gigSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            minLength: 5,
            maxLength: 100
        },

        description: {
            type: String,
            required: true,
            trim: true,
            minLength: 20,
            maxLength: 2000
        },

        category: {
            type: String,
            required: true,
            trim: true,
            maxLength: 50
        },

        price: {
            type: Number,
            required: true,
            min: 1,
            max: 1000000
        },

        freelancer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

gigSchema.index({ freelancer: 1 });

module.exports = mongoose.model('Gig', gigSchema);