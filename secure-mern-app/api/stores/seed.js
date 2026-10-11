const bcrypt = require('bcrypt');
const User = require('../models/User');
const { ROLES } = require('../config/roles');

const seedAdmin = async () => {
    const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        console.warn('Admin credentials not configured - seeding skipped');
        return
    }

    const email = ADMIN_EMAIL.toLowerCase().trim();

    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        ADMIN_PASSWORD.length < 12 ||
        Buffer.byteLength(ADMIN_PASSWORD, 'utf8') > 72
    ) {
        throw new Error ('Invalid admin seed configuration');
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        if (existingUser.role !== ROLES.ADMIN) {
            throw new Error('Admin seed email belongs to a non-admin account');
        }

        console.log('Admin account already exists');
        return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    try {
        await User.create({
            fullName: 'Administrator',
            email,
            passwordHash,
            role: ROLES.ADMIN
        });

        console.log('Admin account seeded successfully');
    } catch (error) {
        if (error.code === 11000) {
            throw new Error('Admin seed email conflict');
        }

        throw error;
    }

}

module.exports = { seedAdmin };
