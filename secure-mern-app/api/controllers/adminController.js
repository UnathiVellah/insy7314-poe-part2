const { users } = require('../stores');

/**
 * GET /api/admin/users
 */
const listUsers = (req, res) => {
    const data = users.map(({ id, fullName, email, role }) => ({ id, fullName, email, role }));
    res.status(200).json({ data });
};

module.exports = { listUsers };
