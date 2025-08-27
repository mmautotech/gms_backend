import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './src/routes/auth.js';
import bookingRoutes from './src/routes/bookings.js';
import serviceRoutes from './src/routes/service.js';
import supplierRoutes from './src/routes/supplier.js';
import partsRoutes from './src/routes/parts.js';
import upSellRoutes from './src/routes/upSell.js';

const app = express();

/** CORS configuration */
const corsOptions = {
    origin: 'http://localhost:3000', // your frontend URL or Electron app
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // preflight

// Helps Chromium/Electron when calling localhost (Private Network Access)
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    next();
});

// JSON parser
app.use(express.json());

// Optional: Trim all string inputs
app.use((req, _res, next) => {
    if (req.body) {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        }
    }
    next();
});

/** Health check */
app.get('/api/health', (_, res) => res.json({ ok: true }));

/** Routes */
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/parts', partsRoutes);
app.use('/api/service', serviceRoutes);
app.use('/api/supplier', supplierRoutes);
app.use('/api/upsell', upSellRoutes);

/** Global error handler */
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

/** DB + Server */
const { MONGO_URI, PORT = 5000 } = process.env;

mongoose
    .connect(MONGO_URI, { dbName: 'gms_db' })
    .then(() => {
        console.log('MongoDB connected to gms_db');
        app.listen(PORT, () => {
            console.log(`API running at http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Mongo error:', err);
        process.exit(1);
    });
