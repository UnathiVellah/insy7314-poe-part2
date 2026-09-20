const jwt = require('jsonwebtoken');
const { ROLES } = require('../config/roles');

const VALID_ROLES = Object.values(ROLES);

/**
 * Verifies the Bearer JWT on protected routes and attaches the decoded
 * payload (id, role) to req.user. Guards routes such as GET /api/auth/me.
 */
const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication token required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Pin the algorithm so a token cannot pick a weaker one (e.g. "none").
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

        if (!VALID_ROLES.includes(decoded.role)) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        req.user = { id: decoded.id, role: decoded.role };
        next();
    } catch (error) {
        // One generic message regardless of whether the token was expired,
        // malformed, or tampered with - avoids giving an attacker feedback
        // on which case applied.
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = { protect };
