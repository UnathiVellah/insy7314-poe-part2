const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { SELF_REGISTER_ROLES } = require('../config/roles');


const publicUser = (user) => ({
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role
});

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
    try {
        const { fullName, email, password, role } = req.body || {};

        if (
            typeof fullName !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            typeof role !== 'string' ||
            !fullName.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                error: 'Valid full name, email, password, and role are required'
            });
        }

        // Never allow public registration to create an admin.
        if (!SELF_REGISTER_ROLES.includes(role)) {
            return res.status(400).json({
                error: 'Invalid registration role'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        if (
            fullName.trim().length > 100 ||
            normalizedEmail.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
            password.length < 12 ||
            Buffer.byteLength(password, 'utf8') > 72
        ) {
            return res.status(400).json({
                error: 'Invalid registration details'
            });
        }

        const existingUser = await User.exists({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                error: 'User already exists'
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const newUser = await User.create({
            fullName: fullName.trim(),
            email: normalizedEmail,
            passwordHash,
            role
        });

        return res.status(201).json({
            message: 'User registered successfully',
            data: publicUser(newUser)
        });
    } catch (error) {
        // The unique email index also protects against repeated registrations.
        if (error.code === 11000) {
            return res.status(409).json({
                error: 'User already exists'
            });
        }

        next(error);
    }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            email.length > 254 ||
            password.length === 0
        ) {
            return res.status(400).json({
                error: 'Valid email and password are required'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // passwordHash is excluded by default in the User model.
        // Explicitly request it only for password verification.
        const user = await User.findOne({
            email: normalizedEmail
        }).select('+passwordHash');

        if (!user) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }

        const token = jwt.sign(
            {
                id: user._id.toString(),
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                algorithm: 'HS256',
                expiresIn: process.env.JWT_EXPIRES_IN || '1h'
            }
        );

        return res.status(200).json({
            message: 'Login successful',
            data: {
                token,
                user: publicUser(user)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/auth/me
 */
const getProfile = async (req, res, next) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({
                error: 'Unauthorized profile request'
            });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(401).json({
                error: 'Invalid or expired token'
            });
        }

        return res.status(200).json({
            data: publicUser(user)
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    getProfile
};