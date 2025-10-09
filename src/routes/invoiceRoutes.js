import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { validateWithZod } from "../middleware/zodMiddleware.js";
import * as invoiceValidators from "../validators/invoice.js";
import * as invoiceController from "../controllers/invoice/index.js";

const router = express.Router();

/**
 * ---------------------------
 * ⚡ Public routes (no login required)
 * ---------------------------
 */

// 🔓 Direct inline PDF view (customer/proforma invoices)
router.get("/:invoiceId/pdf/view", invoiceController.viewInvoicePdf);

/**
 * ---------------------------
 * 🔒 Protected routes (require login)
 * ---------------------------
 */
router.use(requireAuth);

// ✅ Invoice statistics
router.get("/stats", invoiceController.getInvoiceStats);

// ✅ List invoices
router.get(
    "/",
    validateWithZod(invoiceValidators.listInvoicesQuerySchema, "query"),
    invoiceController.getAllInvoices
);

// ✅ Get invoice by booking (fetch only, auto-generate if missing inside controller)
router.get(
    "/booking/:bookingId",
    validateWithZod(invoiceValidators.getInvoiceByBookingParamSchema, "params"),
    invoiceController.getInvoiceByBookingId
);

// ✅ Generate (or regenerate) invoice for booking
router.post(
    "/booking/:bookingId/generate",
    validateWithZod(invoiceValidators.getInvoiceByBookingParamSchema, "params"),
    invoiceController.generateInvoiceByBookingId
);

// ✅ Update invoice
router.put(
    "/:invoiceId",
    validateWithZod(invoiceValidators.getInvoiceByIdParamSchema, "params"),
    validateWithZod(invoiceValidators.updateInvoiceBodySchema),
    invoiceController.updateInvoice
);

export default router;
