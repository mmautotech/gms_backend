// routes/partsRoutes.js
import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateWithZod } from "../middleware/zodMiddleware.js";

import {
    partIdParamSchema,
    createPartBodySchema,
    updatePartBodySchema,
    partQuerySchema,
} from "../validators/part.js";

import * as partsController from "../controllers/partsController.js";

const router = express.Router();

// ✅ All routes require authentication
router.use(requireAuth);

// 🔍 Accessible to ALL authenticated users
router.get("/", validateWithZod(partQuerySchema, "query"), partsController.getParts);
router.get("/dropdown", partsController.getPartsDropdown);
router.get("/:id", validateWithZod(partIdParamSchema, "params"), partsController.getPartById);

// ✏️ Create Part → now allowed for ALL users
router.post("/", validateWithZod(createPartBodySchema), partsController.createPart);

// 🔧 Admin-only routes
router.use(requireRole("admin"));

// Update
router.put(
    "/:id",
    validateWithZod(partIdParamSchema, "params"),
    validateWithZod(updatePartBodySchema),
    partsController.updatePart
);

// Soft delete (deactivate)
router.delete("/:id", validateWithZod(partIdParamSchema, "params"), partsController.deactivatePart);

// Reactivate
router.patch("/:id/activate", validateWithZod(partIdParamSchema, "params"), partsController.activatePart);

export default router;
