// routes/partsRoutes.js
import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateWithZod } from "../middleware/zodMiddleware.js";

import {
    partIdParamSchema,
    bookingIdParamSchema,
    createPartBodySchema,
    updatePartBodySchema,
    partQuerySchema,
} from "../validators/part.js";

import * as partsController from "../controllers/partsController.js";

const router = express.Router();

// ✅ All routes require authentication
router.use(requireAuth);

/**
 * 🔍 Public (all authenticated users)
 */
router.get("/", validateWithZod(partQuerySchema, "query"), partsController.getParts);
router.get("/dropdown", partsController.getPartsDropdown);
router.get("/:id", validateWithZod(partIdParamSchema, "params"), partsController.getPartById);

/**
 * ✏️ Create & Update
 */
router.post("/", validateWithZod(createPartBodySchema), partsController.createPart);
router.put(
    "/:id",
    validateWithZod(partIdParamSchema, "params"),
    validateWithZod(updatePartBodySchema),
    partsController.updatePart
);

/**
 * 🔍 Get all parts linked to booking.services (only active parts)
 */
router.get(
    "/by-booking/:bookingId",
    validateWithZod(bookingIdParamSchema, "params"),
    partsController.getPartsByBooking
);

/**
 * 🔧 Admin-only routes
 */
router.use(requireRole("admin"));

// Soft delete (deactivate)
router.delete(
    "/:id",
    validateWithZod(partIdParamSchema, "params"),
    partsController.deactivatePart
);

// Reactivate
router.patch(
    "/:id/activate",
    validateWithZod(partIdParamSchema, "params"),
    partsController.activatePart
);

export default router;
