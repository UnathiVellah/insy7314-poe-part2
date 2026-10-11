const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { ROLES } = require('../config/roles');

const VALID_ROLES = Object.values(ROLES);

/**
 * Verifies the Bearer JWT on protected routes and attaches the decoded
 * payload (id, role) to req.user. Guards routes such as GET /api/auth/me.
 */
const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !/^Bearer \S+$/.test(authHeader)) {
        return res.status(401).json({
            error: 'Authentication token required'
        });
    }

    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }

        const token = authHeader.slice(7);

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
            { algorithms: ['HS256'] }
        );

        if (
            typeof decoded.id !== 'string' ||
            !mongoose.isObjectIdOrHexString(decoded.id)
        ) {
            return res.status(401).json({
                error: 'Invalid or expired token'
            });
        }

        const user = await User.findById(decoded.id)
            .select('_id role');

        if (!user || !VALID_ROLES.includes(user.role)) {
            return res.status(401).json({
                error: 'Invalid or expired token'
            });
        }

        // Do not trust a role embedded in an old token.
        // If the user's role has changed, require a fresh login.
        if (decoded.role !== user.role) {
            return res.status(401).json({
                error: 'Invalid or expired token'
            });
        }

        req.user = {
            id: user._id.toString(),
            role: user.role
        };

        next();
    } catch (error) {
        // Invalid tokens are authentication failures.
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                error: 'Invalid or expired token'
            });
        }

        // Database failures must not be disguised as invalid tokens.
        next(error);
    }
};

module.exports = { protect };