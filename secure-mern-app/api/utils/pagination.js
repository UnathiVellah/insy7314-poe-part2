// Shared paging for list endpoints. Without a bound, one account (or one
// large table) could make a single request return every row. Defaults keep
// existing clients working: a request with no query string gets the first
// DEFAULT_LIMIT rows, newest first, in the same { data: [...] } shape as before.
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_SKIP = 100000;

/**
 * Reads ?page= and ?limit= from req.query.
 * Returns { page, limit, skip }, or null when a value is not a safe positive
 * integer, the limit is above MAX_LIMIT, or the offset is absurdly large.
 * (Repeated parameters such as ?page=1&page=2 arrive as arrays and are
 * rejected, because Number([..]) is NaN.)
 */
const parsePagination = (query) => {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? DEFAULT_LIMIT);

    if (
        !Number.isSafeInteger(page) ||
        page < 1 ||
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > MAX_LIMIT ||
        (page - 1) * limit > MAX_SKIP
    ) {
        return null;
    }

    return { page, limit, skip: (page - 1) * limit };
};

const paginationMeta = (page, limit, total) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
});

module.exports = { parsePagination, paginationMeta, DEFAULT_LIMIT, MAX_LIMIT };
