const errorHandler = (err, req, res, next) => {
    // Errors flagged with expose (e.g. from assertOwner) are safe to show.
    if (err.expose && err.status >= 400 && err.status < 500) {
        return res.status(err.status).json({ error: err.message });
    }

    console.error('Unhandled System Error:', err.message);
    res.status(500).json({
        error: 'Something went wrong. Please try again later.'
    });
};

module.exports = errorHandler;
