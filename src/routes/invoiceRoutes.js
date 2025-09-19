import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { validateWithZod } from "../middleware/zodMiddleware.js";
import {
    getInvoiceByBooking,
    getAllInvoices,
    updateInvoice,
    getInvoiceStats,
    viewInvoicePdf,
} from "../controllers/invoiceController.js";
import {
    listInvoicesQuerySchema,
    getInvoiceByBookingParamSchema,
    getInvoiceByIdParamSchema,
    updateInvoiceBodySchema,
} from "../validators/invoice.js";

const router = express.Router();

// ---------------------------
// ⚡ Public routes (no login required)
// ---------------------------

// 🔓 Direct inline PDF view (customer/proforma invoices)
router.get("/:invoiceId/pdf/view", viewInvoicePdf);

// ---------------------------
// 🔒 Protected routes (require login)
// ---------------------------
router.use(requireAuth);

// ✅ Stats
router.get("/stats", getInvoiceStats);

// ✅ List invoices
router.get("/", validateWithZod(listInvoicesQuerySchema, "query"), getAllInvoices);

// ✅ Get invoice by booking
router.get(
    "/booking/:bookingId",
    validateWithZod(getInvoiceByBookingParamSchema, "params"),
    getInvoiceByBooking
);

// ✅ Update invoice
router.put(
    "/:invoiceId",
    validateWithZod(getInvoiceByIdParamSchema, "params"),
    validateWithZod(updateInvoiceBodySchema),
    updateInvoice
);

export default router;
