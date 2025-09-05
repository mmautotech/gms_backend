// routes/invoiceRoutes.js
import express from "express";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import {
    getInvoiceValidator,
    getInvoicesValidator,
    createInvoiceValidator,
    updateInvoiceValidator,
} from "../validators/invoice.js";
import {
    getInvoice,
    getInvoices,
    createInvoice,
    updateInvoice
} from "../controllers/invoiceController.js";

const router = express.Router();

// --- All routes require authentication ---
router.use(requireAuth);

// --- GET all invoices (optional filter by bookingId) ---
router.get("/", getInvoicesValidator, validate, getInvoices);

// --- GET single invoice by invoiceNumber or MongoDB _id ---
router.get("/:invoiceNumber", getInvoiceValidator, validate, getInvoice);

// --- CREATE invoice ---
router.post("/", createInvoiceValidator, validate, createInvoice);

// --- UPDATE invoice ---
router.put("/:id", updateInvoiceValidator, validate, updateInvoice);

export default router;
