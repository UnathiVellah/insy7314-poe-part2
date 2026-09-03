const validateRegister = (req, res, next) => {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (
        typeof fullName !== 'string' ||
        typeof email !== 'string' ||
        typeof password !== 'string'
    ) {
        return res.status(400).json({ error: 'All input values must be text' });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (password.length < 8 || password.length > 72) {
        return res.status(400).json({ error: 'Password must be between 8 and 72 characters' });
    }

    req.body = {
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        password
    };

    next();
};

module.exports = { validateRegisterInput };