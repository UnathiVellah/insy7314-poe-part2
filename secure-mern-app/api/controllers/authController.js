const bcrypt = require('bcrypt');

// Local, in-memory user store
const users = [];

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ error: 'Full name, email, and password are required' });
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
            role: 'user'
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
    getProfile,
    users
};