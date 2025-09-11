// src/routes/invoiceRoutes.js
import express from "express";
import {
    getInvoice,
    getAllInvoices,
    updateInvoice
} from "../controllers/invoiceController.js";

const router = express.Router();

// 🧾 Get all invoices
router.get("/", getAllInvoices);

// 🧾 Get (or create) invoice by booking ID
router.get("/:bookingId", getInvoice);

// 🧾 Update invoice by invoice ID
router.put("/:invoiceId", updateInvoice);

export default router;
