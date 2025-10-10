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
 * ============================================================
 *  @route   POST /api/internal-invoices
 *  @desc    Create or update an internal invoice
 *  @access  Private (Admin / Accountant)
 * ============================================================
 */
router.post(
    "/",
    requireAuth,
    requireRole("admin", "accountant"),
    validateWithZod(createInternalInvoiceSchema),
    createInternalInvoice
);

/**
 * ============================================================
 *  @route   GET /api/internal-invoices
 *  @desc    Get all internal invoices (with pagination, filters, search)
 *  @access  Private (Admin / Accountant / Manager)
 * ============================================================
 */
router.get(
    "/",
    requireAuth,
    requireRole("admin", "accountant", "manager"),
    validateWithZod(listInternalInvoicesQuerySchema, "query"),
    getInternalInvoices
);

/**
 * ============================================================
 *  @route   GET /api/internal-invoices/:id
 *  @desc    Get a single internal invoice (includes sales, purchases, VAT, profit)
 *  @access  Private (Admin / Accountant / Manager)
 * ============================================================
 */
router.get(
    "/:id",
    requireAuth,
    requireRole("admin", "accountant", "manager"),
    validateWithZod(internalInvoiceIdParamSchema, "params"),
    getInternalInvoiceById
);

/**
 * ============================================================
 *  @route   GET /api/internal-invoices/:id/pdf/view
 *  @desc    Generate & View Internal Invoice PDF (Profit/Loss format)
 *  @access  Private (All Authenticated Users)
 * ============================================================
 */
router.get(
    "/:id/pdf/view",
    validateWithZod(internalInvoiceIdParamSchema, "params"),
    viewInternalInvoicePdf
);

export default router;
