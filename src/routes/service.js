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

router.use(requireAuth); // apply token auth to all routes

router.post("/", ...createServiceValidator, validate, createService);
router.get("/", getAllServices);
router.patch("/:id", ...updateServiceValidator, validate, updateService);
router.delete("/:id", ...deleteServiceValidator, validate, deleteService);

export default router;
