import express from "express";
import {
    getInvoiceByBooking,
    getAllInvoices,
    updateInvoice,
    downloadInvoicePdf,
    getInvoiceStats
} from "../controllers/invoiceController.js";

const router = express.Router();

// ✅ Invoice stats
router.get("/stats", getInvoiceStats);

// ✅ Get all invoices (supports pagination via query ?page=1&limit=20)
router.get("/", getAllInvoices);

// ✅ Download invoice PDF (specific route must be before dynamic :invoiceId)
router.get("/:invoiceId/pdf", downloadInvoicePdf);

// ✅ Update invoice by ID
router.put("/:invoiceId", updateInvoice);

// ✅ Get (or create) invoice by booking ID
router.get("/booking/:bookingId", getInvoiceByBooking);

export default router;
