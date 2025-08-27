import express from "express";
import {
  createService,
  getAllServices,
  updateService,
  deleteService,
} from "../controllers/serviceController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createServiceValidator,
  updateServiceValidator,
  deleteServiceValidator,
} from "../validators/service.js";

const router = express.Router();

router.post(
  "/",
  requireAuth,
  createServiceValidator,
  validate,
  createService
);

router.get("/", requireAuth, getAllServices);

router.patch(
  "/:id",
  requireAuth,
  updateServiceValidator,
  validate,
  updateService
);

router.delete(
  "/:id",
  requireAuth,
  deleteServiceValidator,
  validate,
  deleteService
);

export default router;
