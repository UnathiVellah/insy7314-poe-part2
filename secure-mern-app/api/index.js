// 1. Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const https = require('https');
const fs = require('fs');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
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
        crossOriginResourcePolicy: { policy: 'same-site' }
    })
);

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

seedAdmin().then(startServer);