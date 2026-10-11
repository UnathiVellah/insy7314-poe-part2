const User = require('../models/User');

/**
 * GET /api/admin/users
 *
 * Previously read from the in-memory `stores.users` array left over from
 * before the MongoDB migration. Registration/login have written to the
 * User model for a while now, so that array was never populated and this
 * endpoint always returned an empty list. Fixed to query MongoDB directly.
 * passwordHash is excluded by the User model's `select: false` by default,
 * so it's never at risk of appearing here.
 */
const listUsers = async (req, res, next) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });

        const data = users.map((user) => ({
            id: user._id.toString(),
            fullName: user.fullName,
            email: user.email,
            role: user.role
        }));

        res.status(200).json({ data });
    } catch (error) {
        next(error);
    }
};

module.exports = { listUsers };
