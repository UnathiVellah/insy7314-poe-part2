const { SELF_REGISTER_ROLES } = require('../config/roles');

// Kept in sync with authController.js's own re-check (password length,
// byte length, email length). Previously this middleware allowed an 8-72
// character password while the controller required 12-72, so a password of
// 8-11 characters passed validation here only to be rejected two steps
// later with a different, confusing error ("Invalid registration details").
// This is now the single authoritative rule set for both.
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_BYTES = 72; // bcrypt silently ignores anything past 72 bytes
const MAX_EMAIL_LENGTH = 254; // RFC 5321
const MAX_NAME_LENGTH = 100;

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

    const trimmedName = fullName.trim();
    const normalizedEmail = email.toLowerCase().trim();

    if (!trimmedName || trimmedName.length > MAX_NAME_LENGTH) {
        return res.status(400).json({ error: 'Full name must be between 1 and 100 characters' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > MAX_EMAIL_LENGTH) {
        return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (!SELF_REGISTER_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Role must be either client or freelancer' });
    }

    if (
        password.length < MIN_PASSWORD_LENGTH ||
        Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES
    ) {
        return res.status(400).json({
            error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
        });
    }

    req.body = {
        // Stored exactly as typed. Output encoding is done by React when
        // the name is rendered; escaping here too would show O'Brien as
        // O&#39;Brien.
        fullName: trimmedName,
        email: normalizedEmail,
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

    const normalizedEmail = email.toLowerCase().trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > MAX_EMAIL_LENGTH) {
        return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // No length/complexity check on the password here on purpose - that
    // belongs at registration. A login attempt should fail on wrong
    // credentials, not on "your password doesn't meet policy", which would
    // leak policy details to an unauthenticated caller.
    req.body = {
        email: normalizedEmail,
        password
    };

    next();
};

module.exports = { validateRegisterInput, validateLoginInput };
