// src/routes/invoiceRoutes.js
import express from "express";
import { createInvoice, getInvoice } from "../controllers/invoiceController.js";

const router = express.Router();

// 🧾 Create invoice from booking
router.post("/", createInvoice);

// 🧾 Get invoice by booking ID
router.get("/:bookingId", getInvoice);

export default router;
