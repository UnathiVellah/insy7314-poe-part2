// Shared in-memory data stores. Every module that needs data imports from
// here so all routes and controllers see the same arrays.
const users = [];

module.exports = { users };
