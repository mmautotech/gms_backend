// routes/service.js
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

import {
  createServiceValidator,
  updateServiceValidator,
  deleteServiceValidator,
  activateServiceValidator,
  getServicePartsValidator,
  addPartsValidator,
  removePartsValidator,
} from "../validators/service.js";

import {
  createService,
  getAllServices,
  getServiceOptions,
  getServiceParts,
  updateService,
  deleteService,
  activateService,
  addPartToService,
  removePartFromService,
} from "../controllers/serviceController.js";

const router = express.Router();

// ✅ All routes require authentication
router.use(requireAuth);

// --- OPTIONS ---
router.get("/options", getServiceOptions);

// --- CRUD ---
router.post("/", validate, ...createServiceValidator, createService);
router.get("/", getAllServices);
router.patch("/:id", validate, ...updateServiceValidator, updateService);

// --- SOFT DELETE & ACTIVATE ---
router.delete("/:id", validate, ...deleteServiceValidator, deleteService);
router.patch("/:id/activate", validate, ...activateServiceValidator, activateService);

// --- PARTS MANAGEMENT ---
router.get("/:id/parts", validate, ...getServicePartsValidator, getServiceParts);
router.post("/:id/add-parts", validate, ...addPartsValidator, addPartToService);
router.post("/:id/remove-parts", validate, ...removePartsValidator, removePartFromService);

export default router;
