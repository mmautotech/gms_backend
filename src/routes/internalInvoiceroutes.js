// src/routes/internalInvoiceRoutes.js
import express from "express";
import {
    getAllInternalInvoices,
    getInternalInvoiceById,
    deleteInternalInvoice,
    generateInternalInvoice,
} from "../controllers/internalinvoice.js";

import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * @route   GET /internal-invoices
 * @desc    Get all internal invoices (admin only)
 */
router.get("/", requireAuth, requireRole("admin"), getAllInternalInvoices);

/**
 * @route   POST /internal-invoices/generate
 * @desc    Generate internal invoice from a main invoice (admin only)
 */
router.post("/generate", requireAuth, requireRole("admin"), generateInternalInvoice);

/**
 * @route   GET /internal-invoices/:id
 * @desc    Get internal invoice by ID (admin only)
 */
router.get("/:id", requireAuth, requireRole("admin"), getInternalInvoiceById);

/**
 * @route   DELETE /internal-invoices/:id
 * @desc    Delete an internal invoice (admin only)
 */
router.delete("/:id", requireAuth, requireRole("admin"), deleteInternalInvoice);

export default router;