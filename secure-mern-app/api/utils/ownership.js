const { ROLES } = require('../config/roles');

/**
 * Returns the resource if the caller owns it, otherwise throws a 404.
 * A 404 (not 403) is used so the API does not reveal that someone else's
 * resource exists.
 *
 *   const gig = assertOwner(gigs.find(g => g.id === req.params.id), req.user);
 *
 * Pass { allowAdmin: true } for read access that admins may also have.
 */
const assertOwner = (resource, user, { allowAdmin = false } = {}) => {
    const isOwner = resource && user && resource.ownerId === user.id;
    const isAllowedAdmin = resource && allowAdmin && user && user.role === ROLES.ADMIN;

    if (!isOwner && !isAllowedAdmin) {
        const error = new Error('Resource not found');
        error.status = 404;
        error.expose = true;
        throw error;
    }

    return resource;
};

module.exports = { assertOwner };
