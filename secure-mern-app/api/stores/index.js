const { randomUUID } = require('crypto');

const users = [];
const gigs = [];
const bookings = [];
const transactions = [];

// Every gig, booking and transaction shares this base shape so ownership
// checks can rely on ownerId being present.
const createRecord = (store, ownerId, fields) => {
    const record = {
        id: randomUUID(),
        ownerId,
        createdAt: new Date().toISOString(),
        ...fields
    };
    store.push(record);
    return record;
};

module.exports = { users, gigs, bookings, transactions, createRecord };
