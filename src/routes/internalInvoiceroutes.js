// src/routes/internalInvoiceRoutes.js
import express from "express";
import {
    createInternalInvoice,
    getInternalInvoices,
    getInternalInvoiceById,
} from "../controllers/internalinvoice.js"; // ✅ make sure filename matches

const router = express.Router();

/**
 * @route POST /api/internal-invoices
 * @desc Create a new internal invoice
 * Only invoiceId is required in the body; purchaseInvoiceId is auto-resolved by booking
 */
router.post("/", createInternalInvoice);

/**
 * @route GET /api/internal-invoices
 * @desc Get all internal invoices (with pagination & filters)
 */
router.get("/", getInternalInvoices);

/**
 * @route GET /api/internal-invoices/:id
 * @desc Get single internal invoice by ID
 */
router.get("/:id", getInternalInvoiceById);

export default router;
