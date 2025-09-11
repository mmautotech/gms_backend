// src/routes/invoiceRoutes.js
import express from "express";
import {
    getInvoiceByBooking,
    getAllInvoices,
    updateInvoice,
    downloadInvoicePdf
} from "../controllers/invoiceController.js";


const router = express.Router();

// 🧾 Get all invoices
router.get("/", getAllInvoices);

// 🧾 Download invoice as PDF (specific route first)
router.get("/:invoiceId/pdf", downloadInvoicePdf);

// 🧾 Update invoice by invoice ID
router.put("/:invoiceId", updateInvoice);

// 🧾 Get (or create) invoice by booking ID
router.get("/:bookingId", getInvoiceByBooking);


export default router;
