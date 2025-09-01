// src/routes/invoiceRoutes.js
import express from 'express';
import { createInvoiceFromBooking, generateInvoicePDF, updateInvoice } from '../controllers/invoiceController.js';

const router = express.Router();

// Create invoice from booking
router.post('/from-booking', createInvoiceFromBooking);

// Generate invoice PDF
router.get('/pdf/:invoiceNumber', generateInvoicePDF);

// Update invoice details
router.put('/:invoiceNumber', updateInvoice);


export default router;
