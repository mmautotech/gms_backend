import express from "express";
import {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplierController.js";
import { requireAuth } from "../middleware/auth.js";
import { createSupplierValidator, updateSupplierValidator } from "../validators/supplier.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.post("/", requireAuth, createSupplierValidator, validate, createSupplier);
router.get("/", requireAuth, getAllSuppliers);
router.get("/:id", requireAuth, getSupplierById);
router.put("/:id", requireAuth, updateSupplierValidator, validate, updateSupplier);
router.delete("/:id", requireAuth, deleteSupplier);

export default router;
