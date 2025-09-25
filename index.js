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
import invoiceRoutes from './src/routes/invoiceRoutes.js';
import purchaseInvoiceRoutes from './src/routes/purchaseInvoiceRoutes.js';
import { errorHandlerMiddleware } from "./src/utils/errorHandler.js";
import dashoardRoutes from "./src/routes/dashboardRoutes.js"
import userRoutes from "./src/routes/user.js";

const app = express();

/** -------------------------------
 * 🔐 CORS Configuration
 -------------------------------- */
const corsOptions = {
    origin: 'http://localhost:3000', // frontend/electron URL
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // preflight

/** 🔐 Chromium Private Network Access */
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    next();
});

/** -------------------------------
 * 📦 Body Parsers (with Base64 Support)
 -------------------------------- */
// Supports JSON and base64 uploads up to 5MB
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

/** ✂️ Trim all string inputs */
app.use((req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        }
    }
    next();
});

/** ✅ Health check */
app.get('/api/health', (_, res) => res.json({ ok: true }));

/** 📦 Routes */
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/parts', partsRoutes);
app.use('/api/service', serviceRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/upsell', upSellRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/purchase-invoices', purchaseInvoiceRoutes);
app.use('/api/dashboard', dashoardRoutes);
app.use("/api/users", userRoutes);

/** ❗ Custom error handler */
app.use(errorHandlerMiddleware);

/** 🧯 Fallback global error handler */
app.use((err, req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

/** -------------------------------
 * 🚀 Connect DB and Start Server
 -------------------------------- */
const { MONGO_URI, PORT = 5000 } = process.env;

mongoose
    .connect(MONGO_URI, { dbName: 'gms_db' })
    .then(() => {
        console.log('✅ MongoDB connected to gms_db');
        app.listen(PORT, () => {
            console.log(`🚀 API running at http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ Mongo error:', err);
        process.exit(1);
    });
