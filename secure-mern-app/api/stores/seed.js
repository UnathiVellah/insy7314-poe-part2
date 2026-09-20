const bcrypt = require('bcrypt');
const { users } = require('./index');
const { ROLES } = require('../config/roles');

// Admin accounts cannot be created through the API, so one is seeded at
// startup from environment variables.
const seedAdmin = async () => {
    const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set - no admin account seeded');
        return;
    }

    const email = ADMIN_EMAIL.toLowerCase().trim();
    if (users.some(u => u.email === email)) {
        return;
    }

    users.push({
        id: `u${users.length + 1}`,
        fullName: 'Administrator',
        email,
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
        role: ROLES.ADMIN
    });
    console.log('Admin account seeded');
};

module.exports = { seedAdmin };
