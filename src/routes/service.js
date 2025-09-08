import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createServiceValidator,
  updateServiceValidator,
  deleteServiceValidator,
} from "../validators/service.js";
import {
  createService,
  getAllServices,
  updateService,
  deleteService,
} from "../controllers/serviceController.js";

const router = express.Router();

router.use(requireAuth); // apply token auth to all routes

router.post("/", validate, ...createServiceValidator, createService);
router.get("/", getAllServices);
router.patch("/:id", validate, ...updateServiceValidator, validate, updateService);
router.delete("/:id", validate, ...deleteServiceValidator, validate, deleteService);

export default router;
