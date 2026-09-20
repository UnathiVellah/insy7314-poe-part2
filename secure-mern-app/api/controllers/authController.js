const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { users } = require('../stores');

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
    try {
        const { fullName, email, password, role } = req.body;

        if (!fullName || !email || !password || !role) {
            return res.status(400).json({ error: 'Full name, email, password, and role are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = users.find(u => u.email === normalizedEmail);
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash before storing - never persist the raw password, even locally.
        const passwordHash = await bcrypt.hash(password, 12);

        const newUser = {
            id: `u${users.length + 1}`,
            fullName: fullName.trim(),
            email: normalizedEmail,
            passwordHash,
            role
        };

        users.push(newUser);

        // passwordHash is intentionally omitted from the response
        res.status(201).json({
            message: 'User registered successfully',
            data: {
                id: newUser.id,
                fullName: newUser.fullName,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const normalizedEmail = email.toLowerCase().trim();
        const user = users.find(u => u.email === normalizedEmail);

        // Same generic message whether the email doesn't exist or the
        // password is wrong - this prevents user enumeration attacks.
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!process.env.JWT_SECRET) {
            // Fail loudly on the server side (logs), safely on the client side.
            throw new Error('JWT_SECRET is not configured');
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
        );

        res.status(200).json({
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Protected profile / test route
 * GET /api/auth/me
 */

const getProfile = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized profile request' });
        }

        const user = users.find(u => u.id === req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
            data: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    getProfile,
    users
};