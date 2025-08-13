import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './src/routes/auth.js';
import bookingRoutes from './src/routes/bookings.js';

const app = express();

/** CORS (Express 5–safe) */
const corsOptions = {
    origin: '*', // dev only — restrict in prod
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
    optionsSuccessStatus: 204, // ensure 204 on preflight
};

app.use(cors(corsOptions));

// Preflight (must use RegExp with Express 5; '*' route strings throw)
app.options(/.*/, cors(corsOptions));

/** Helps Chromium/Electron when calling localhost (Private Network Access) */
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    next();
});

app.use(express.json());

/** Routes */
app.get('/api/health', (_, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);

/** DB + Server */
const { MONGO_URI, PORT = 5000 } = process.env;

mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');
        app.listen(PORT, () => {
            console.log(`API on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Mongo error:', err);
        process.exit(1);
    });
