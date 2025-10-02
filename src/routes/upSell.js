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
    getUpsellPhoto
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

// --- Get Upsell Photo ---
router.get(
    "/booking/:bookingId/upsell/:upsellId/photo",
    validateWithZod(upsellParamsSchema, "params"),
    getUpsellPhoto
);

// --- Update Upsell ---
router.put(
    "/booking/:bookingId/upsell/:upsellId",
    validateWithZod(upsellParamsSchema, "params"),
    validateWithZod(updateUpsellBodySchema, "body")
    // your updateUpsell controller here
);

export default router;
