/**
 * Role-based access control. Use after protect:
 *   router.post('/', protect, authorize(ROLES.FREELANCER), createGig)
 */
const authorize = (...allowedRoles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication token required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
        console.warn(`Access denied: user ${req.user.id} (${req.user.role}) -> ${req.method} ${req.originalUrl}`);
        return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }

    next();
};

module.exports = { authorize };
