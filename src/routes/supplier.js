import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateWithZod } from "../middleware/zodMiddleware.js";
import {
  supplierIdParamSchema,
  createSupplierBodySchema,
  updateSupplierBodySchema,
  supplierQuerySchema,
} from "../validators/supplier.js";
import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  restoreSupplier,
} from "../controllers/supplierController.js";

const router = express.Router();

// 🔒 All supplier routes require authentication
router.use(requireAuth);

// --- Public (authenticated users) ---
router.get(
  "/",
  validateWithZod(supplierQuerySchema, "query"),
  getSuppliers
);

router.get(
  "/:id",
  validateWithZod(supplierIdParamSchema, "params"),
  getSupplierById
);

// --- Admin-only routes ---
router.post(
  "/",
  requireRole("admin"),
  validateWithZod(createSupplierBodySchema, "body"),
  createSupplier
);

router.put(
  "/:id",
  requireRole("admin"),
  validateWithZod(supplierIdParamSchema, "params"),
  validateWithZod(updateSupplierBodySchema, "body"),
  updateSupplier
);

router.delete(
  "/:id",
  requireRole("admin"),
  validateWithZod(supplierIdParamSchema, "params"),
  deleteSupplier
);

router.patch(
  "/:id/restore",
  requireRole("admin"),
  validateWithZod(supplierIdParamSchema, "params"),
  restoreSupplier
);

export default router;
