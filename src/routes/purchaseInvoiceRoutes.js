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

import * as purchaseController from "../controllers/purchaseInvoiceController.js";

const router = express.Router();

router.use(requireAuth);

// --- User routes ---
router.post(
    "/",
    validateWithZod(createPurchaseInvoiceSchema, "body"),
    purchaseController.createPurchaseInvoice
);

router.get(
    "/my",
    validateWithZod(invoiceQuerySchema, "query"),
    purchaseController.getMyInvoices
);

router.get(
    "/:id",
    validateWithZod(invoiceIdParamSchema, "params"),
    purchaseController.getPurchaseInvoiceById
);

router.patch(
    "/:id/status",
    validateWithZod(invoiceIdParamSchema, "params"),
    validateWithZod(updateInvoiceStatusSchema, "body"),
    purchaseController.updateMyInvoiceStatus
);

// --- Admin routes ---
router.get(
    "/",
    requireRole("admin"),
    validateWithZod(invoiceQuerySchema, "query"),
    purchaseController.getAllInvoices
);

router.put(
    "/:id",
    requireRole("admin"),
    validateWithZod(invoiceIdParamSchema, "params"),
    validateWithZod(updatePurchaseInvoiceSchema, "body"),
    purchaseController.updatePurchaseInvoice
);

router.delete(
    "/:id",
    requireRole("admin"),
    validateWithZod(invoiceIdParamSchema, "params"),
    purchaseController.deletePurchaseInvoice
);




export default router;