import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateWithZod } from "../middleware/zodMiddleware.js";

import {
    createPurchaseInvoiceSchema,
    updatePurchaseInvoiceSchema,
    updateInvoiceStatusSchema,
    invoiceIdParamSchema,
    invoiceQuerySchema,
} from "../validators/purchaseInvoice.js";

import * as purchaseController from "../controllers/purchase/index.js";

const router = express.Router();

// 🔐 All routes require authentication
router.use(requireAuth);

// --- Create (any authenticated user) ---
router.post(
    "/",
    validateWithZod(createPurchaseInvoiceSchema, "body"),
    purchaseController.createPurchaseInvoice
);

// --- Get invoices (admin = all, non-admin = only own) ---
router.get(
    "/",
    validateWithZod(invoiceQuerySchema, "query"),
    purchaseController.getInvoices
);

// --- Get single invoice ---
router.get(
    "/:id",
    validateWithZod(invoiceIdParamSchema, "params"),
    purchaseController.getPurchaseInvoiceById
);

// --- Update invoice status (any authenticated user) ---
router.patch(
    "/:id/status",
    validateWithZod(invoiceIdParamSchema, "params"),
    validateWithZod(updateInvoiceStatusSchema, "body"),
    purchaseController.updateInvoiceStatus // 👈 new controller
);

// --- Full update (authenticated user, not only admin) ---
router.put(
    "/:id",
    validateWithZod(invoiceIdParamSchema, "params"),
    validateWithZod(updatePurchaseInvoiceSchema, "body"),
    purchaseController.updatePurchaseInvoice // 👈 updated controller
);

// --- Admin-only delete ---
router.delete(
    "/:id",
    requireRole("admin"),
    validateWithZod(invoiceIdParamSchema, "params"),
    purchaseController.deletePurchaseInvoice
);

export default router;
