import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateWithZod } from "../middleware/zodMiddlewaree.js";

import {
  supplierIdParamSchema,
  createSupplierBodySchema,
  updateSupplierBodySchema,
  supplierQuerySchema,
} from "../validators/supplier.js";

import * as supplierController from "../controllers/supplierController.js";

const router = express.Router();

// 🔒 All supplier routes require authentication
router.use(requireAuth);

// --- Public (authenticated users) ---
router.get("/", validateWithZod(supplierQuerySchema, "query"), supplierController.getSuppliers);
router.get("/:id", validateWithZod(supplierIdParamSchema, "params"), supplierController.getSupplierById);

// --- Admin-only routes ---
router.post(
  "/",
  requireRole("admin"),
  validateWithZod(createSupplierBodySchema, "body"),
  supplierController.createSupplier
);

router.put(
  "/:id",
  requireRole("admin"),
  validateWithZod(supplierIdParamSchema, "params"),
  validateWithZod(updateSupplierBodySchema, "body"),
  supplierController.updateSupplier
);

router.delete(
  "/:id",
  requireRole("admin"),
  validateWithZod(supplierIdParamSchema, "params"),
  supplierController.deleteSupplier
);

router.patch(
  "/:id/restore",
  requireRole("admin"),
  validateWithZod(supplierIdParamSchema, "params"),
  supplierController.restoreSupplier
);

export default router;
