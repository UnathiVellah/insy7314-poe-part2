// Defense-in-depth against NoSQL operator injection: e.g. sending
// { "email": { "$ne": null } } instead of a string, which a naive Mongoose
// query could interpret as "email is not null" rather than "email equals
// this value". validateAuthInput/authController/gigController already
// reject any non-string value for the fields they care about before it
// reaches Mongoose, but this runs globally (in index.js, before routes) so
// the same protection covers every endpoint, including ones added later.
//
// Note on why this isn't the popular `express-mongo-sanitize` package: that
// package tries to reassign `req.query` outright, and Express 5 made
// `req.query` a read-only getter - it throws a TypeError on every single
// request under this stack (confirmed by testing it directly). This
// sanitizer only ever mutates objects in place (deleting their own keys),
// never reassigns `req.body`, `req.query` or `req.params` themselves, so
// it's safe under Express 5.
//
// This file does NOT escape string values, and neither does the API
// anywhere else: text is stored exactly as typed and HTML-encoded when it is
// rendered (React does this for text content). Escaping on the way in would
// be encoded a second time on the way out, and in this middleware it would
// also silently change passwords before they are hashed.

const DANGEROUS_KEY = /^\$|\./;

// Recursively deletes any key that looks like a MongoDB operator ($gt, $ne,
// $where, ...) or contains a literal dot (which can be used to reach into
// nested fields), mutating `obj` in place.
function stripDangerousKeys(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 10) return;

    for (const key of Object.keys(obj)) {
        if (DANGEROUS_KEY.test(key)) {
            delete obj[key];
            continue;
        }

        const value = obj[key];
        if (value && typeof value === 'object') {
            stripDangerousKeys(value, depth + 1);
        }
    }
}

// Applied globally in index.js, before routes. Only req.body is touched -
// it's a plain object body-parser builds fresh per request, so mutating its
// keys is always safe. req.query is deliberately left alone: it's read-only
// as a reference in Express 5, parsed with the "simple" parser by default
// (no bracket-to-nested-object expansion), and no route builds a Mongo
// query directly from req.query.
const sanitizeInput = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        stripDangerousKeys(req.body);
    }
    next();
};

module.exports = { sanitizeInput };
