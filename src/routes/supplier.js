import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createSupplierValidator, updateSupplierValidator } from "../validators/supplier.js";
import {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplierController.js";

const router = express.Router();
router.use(requireAuth);

router.post("/", validate, ...createSupplierValidator, createSupplier);
router.get("/", getAllSuppliers);
router.get("/:id", getSupplierById);
router.put("/:id", validate, ...updateSupplierValidator, updateSupplier);
router.delete("/:id", deleteSupplier);

export default router;
