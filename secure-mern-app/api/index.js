// 1. Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const https = require('https');
const fs = require('fs');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');
const { sanitizeInput } = require('./middleware/sanitizeInput');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const gigRoutes = require('./routes/gigRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const connectDB = require("./config/db");
const { seedAdmin } = require('./stores/seed');

const app = express();
const PORT = process.env.PORT || 4000;
const USE_HTTPS = process.env.USE_HTTPS === 'true';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// 2. Disable technology disclosure
app.disable('x-powered-by');

// 3. Security headers + CSP 
app.use(
    helmet({
        // The API only returns JSON, so it needs no scripts, styles or frames.
        contentSecurityPolicy: {
            useDefaults: false,
            directives: {
                defaultSrc: ["'none'"],
                baseUri: ["'none'"],
                formAction: ["'none'"],
                frameAncestors: ["'none'"]
            }
        },
        strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
        referrerPolicy: { policy: 'no-referrer' },
        frameguard: { action: 'deny' },
        crossOriginResourcePolicy: { policy: 'same-site' }
    })
);

// Helmet has no Permissions-Policy option, so switch off browser features
// the API never needs.
app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    next();
});

// Responses carry tokens and financial data, so browsers and proxies must not cache them.
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});

// 4. Restrict CORS to the frontend origin
app.use(
    cors({
        origin: CLIENT_ORIGIN,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
    })
);

// 5. Limit Payload size
app.use(express.json({ limit: '10kb' }));

// 5b. Strip NoSQL-operator keys ($gt, $ne, $where, ...) from every request
// body, globally, so the same protection covers every route - including
// gigs/bookings (see middleware/sanitizeInput.js for why this isn't the
// usual express-mongo-sanitize package - it's incompatible with Express 5).
app.use(sanitizeInput);

// 6. Root and health endpoints
app.get('/', (req, res) => {
    res.status(200).json({
        app: process.env.APP_NAME || 'HustleHub+API',
        message: 'HustleHub+ API is running securely.'
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        protocol: USE_HTTPS ? 'HTTPS' : 'HTTP'
    });
});

// 7. Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/bookings', bookingRoutes);

// 8. 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// 9. Centralised error handler
app.use(errorHandler);

// 10. Seed the admin, then start the server - HTTPS when configured, HTTP otherwise
const startServer = () => {
    if (USE_HTTPS) {
        const keyPath = process.env.SSL_KEY_PATH || path.join(__dirname, 'certs', 'localhost-key.pem');
        const certPath = process.env.SSL_CERT_PATH || path.join(__dirname, 'certs', 'localhost-cert.pem');
        const httpsOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
        https.createServer(httpsOptions, app).listen(PORT, () => {
            console.log(`HTTPS server running on port ${PORT}`);
        });
    } else {
        app.listen(PORT, () => {
            console.log(`HTTP server running on port ${PORT}`);
        });
    }
};

const initializeApp = async () => {
    try {
        console.log("Step 1: Connecting to MongoDB...");
        await connectDB();

        console.log("Step 2: Initializing admin...");
        await seedAdmin();

        console.log("Step 3: Starting server...");
        startServer();

    } catch (error) {
        console.error("Application initialization failed.");

        // Safe diagnostic information for local development
        if (process.env.NODE_ENV === "development") {
            console.error("Error type:", error.name);
            console.error("Error code:", error.code || "N/A");
        }

        process.exit(1);
    }
};

initializeApp();