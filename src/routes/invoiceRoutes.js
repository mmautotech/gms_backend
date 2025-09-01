import express from 'express';
import { createInvoice, generateInvoicePDF } from '../controllers/invoiceController.js';

const router = express.Router();

// Route to create an invoice
router.post('/create-invoice', createInvoice);

// Route to generate PDF for an invoice by its invoice number
router.get('/generate-invoice/:invoiceNumber', generateInvoicePDF);

export default router;
