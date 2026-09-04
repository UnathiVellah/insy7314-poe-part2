const errorHandler = (err, req, res, next) => {
    console.error('Unhandled System Error:', err.message);
    res.status(500).json({
        error: 'Something went wrong. Please try again later.'
    });
};

module.exports = errorHandler;