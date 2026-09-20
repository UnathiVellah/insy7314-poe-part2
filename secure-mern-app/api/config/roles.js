const ROLES = Object.freeze({
    CLIENT: 'client',
    FREELANCER: 'freelancer',
    ADMIN: 'admin'
});

// Roles a user may choose for themselves at registration.
// ADMIN is deliberately excluded - it can only be seeded server-side.
const SELF_REGISTER_ROLES = Object.freeze([ROLES.CLIENT, ROLES.FREELANCER]);

module.exports = { ROLES, SELF_REGISTER_ROLES };
