// src/routes/internalInvoiceRoutes.js
import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateWithZod } from "../middleware/zodMiddleware.js";
import {
    createInternalInvoiceSchema,
    listInternalInvoicesQuerySchema,
    internalInvoiceIdParamSchema,
} from "../validators/internalInvoice.js";
import {
    createInternalInvoice,
    getInternalInvoices,
    getInternalInvoiceById,
    viewInternalInvoicePdf,
} from "../controllers/internalInvoice/index.js";

const router = express.Router();

/**
 * @route POST /api/internal-invoices
 * @desc Create a new internal invoice
 * @access Private (Admin / Accountant)
 */
router.post(
    "/",
    requireAuth,
    validateWithZod(createInternalInvoiceSchema),
    createInternalInvoice
);

/**
 * @route GET /api/internal-invoices
 * @desc Get all internal invoices (with pagination & filters)
 * @access Private
 */
router.get(
    "/",
    requireAuth,
    requireRole("admin", "accountant", "manager"),
    validateWithZod(listInternalInvoicesQuerySchema, "query"),
    getInternalInvoices
);

/**
 * @route GET /api/internal-invoices/:id
 * @desc Get single internal invoice by ID
 * @access Private
 */
router.get(
    "/:id",
    requireAuth,
    requireRole("admin", "accountant", "manager"),
    validateWithZod(internalInvoiceIdParamSchema, "params"),
    getInternalInvoiceById
);

/**
 * @route GET /api/internal-invoices/:id/pdf/view
 * @desc Generate & View PDF (Profit/Loss format)
 * @access Private
 */
router.get(
    "/:id/pdf/view",
    validateWithZod(internalInvoiceIdParamSchema, "params"),
    viewInternalInvoicePdf
);

export default router;
