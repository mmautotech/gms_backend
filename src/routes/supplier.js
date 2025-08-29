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
router.use(requireAuth);

router.post("/", ...createSupplierValidator, validate, createSupplier);
router.get("/", getAllSuppliers);
router.get("/:id", getSupplierById);
router.put("/:id", ...updateSupplierValidator, validate, updateSupplier);
router.delete("/:id", deleteSupplier);

export default router;
