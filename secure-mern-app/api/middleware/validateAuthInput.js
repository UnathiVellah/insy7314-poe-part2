const { SELF_REGISTER_ROLES } = require('../config/roles');

const validateRegisterInput = (req, res, next) => {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password || !role) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (
        typeof fullName !== 'string' ||
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        typeof role !== 'string'
    ) {
        return res.status(400).json({ error: 'All input values must be text' });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (!SELF_REGISTER_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Role must be either client or freelancer' });
    }

    if (password.length < 8 || password.length > 72) {
        return res.status(400).json({ error: 'Password must be between 8 and 72 characters' });
    }

    req.body = {
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        password,
        role
    };

    next();
};

const validateLoginInput = (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'All input values must be text' });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // No length/complexity check here on purpose - that belongs at
    // registration. A login attempt should fail on wrong credentials, not on
    // "your password doesn't meet policy", which would leak policy details
    // to an unauthenticated caller.
    req.body = {
        email: email.toLowerCase().trim(),
        password
    };

    next();
};

module.exports = { validateRegisterInput, validateLoginInput };