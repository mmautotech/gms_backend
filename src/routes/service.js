import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

import {
  createServiceValidator,
  updateServiceValidator,
  deleteServiceValidator,
  activateServiceValidator,
  getServicePartsValidator,
  getServiceByIdValidator,
} from "../validators/service.js";

import {
  createService,
  getAllServices,
  getServiceById,
  getServiceOptions,
  getServiceParts,
  updateService,
  deleteService,
  activateService,
} from "../controllers/serviceController.js";

const router = express.Router();

// ✅ All routes require authentication
router.use(requireAuth);

// --- OPTIONS ---
router.get("/options", getServiceOptions);

// --- CRUD ---
router.post("/", validate, ...createServiceValidator, createService);
router.get("/", getAllServices);
router.get("/:id", validate, ...getServiceByIdValidator, getServiceById);
router.patch("/:id", validate, ...updateServiceValidator, updateService);

// --- SOFT DELETE & ACTIVATE ---
router.delete("/:id", validate, ...deleteServiceValidator, deleteService);
router.patch("/:id/activate", validate, ...activateServiceValidator, activateService);

// --- PARTS ---
router.get("/:id/parts", validate, ...getServicePartsValidator, getServiceParts);

export default router;
