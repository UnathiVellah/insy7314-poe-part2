const User = require('../models/User');
const { parsePagination, paginationMeta } = require('../utils/pagination');

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
        const paging = parsePagination(req.query);

        if (!paging) {
            return res.status(400).json({
                error: 'Invalid pagination parameters'
            });
        }

        const [users, total] = await Promise.all([
            User.find()
                .sort({ createdAt: -1, _id: -1 })
                .skip(paging.skip)
                .limit(paging.limit),
            User.countDocuments()
        ]);

        const data = users.map((user) => ({
            id: user._id.toString(),
            fullName: user.fullName,
            email: user.email,
            role: user.role
        }));

        res.status(200).json({
            data,
            pagination: paginationMeta(paging.page, paging.limit, total)
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { listUsers };
