// src/routes/upsell.js
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { validateWithZod } from "../middleware/zodMiddleware.js";
import {
    bookingIdParamSchema,
    upsellParamsSchema,
    createUpsellBodySchema,
    updateUpsellBodySchema,
} from "../validators/upsell.js";
import {
    createUpsell,
    getSellsByBooking,
} from "../controllers/upsellController.js";


const router = express.Router();

// 🔒 Require authentication for all upsell routes
router.use(requireAuth);

// --- Create Upsell ---
router.post(
    "/booking/:bookingId",
    validateWithZod(bookingIdParamSchema, "params"),
    validateWithZod(createUpsellBodySchema, "body"),
    createUpsell
);

// --- Get All Sells for a Booking ---
router.get(
    "/booking/:bookingId",
    validateWithZod(bookingIdParamSchema, "params"),
    getSellsByBooking
);

// --- Update Upsell ---
router.put(
    "/booking/:bookingId/upsell/:upsellId",
    validateWithZod(upsellParamsSchema, "params"),
    validateWithZod(updateUpsellBodySchema, "body"),
);

export default router;