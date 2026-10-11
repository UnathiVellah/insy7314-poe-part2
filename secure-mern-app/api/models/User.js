const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required:true,
            trim: true,
            maxLength: 100
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            maxLength: 254
        },

        passwordHash: {
            type: String,
            required: true,
            select: false
        },

        role: {
            type: String,
            enum: ['client', 'freelancer', 'admin'],
            required: true,
            default: 'client'
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

module.exports = mongoose.model('User', userSchema);