// src/routes/upsell.js
import express from "express";
import {
    createUpsell,
    getUpsellsByBooking,
    getUpsellById,
    updateUpsell,
    deleteUpsell,
} from "../controllers/upsellController.js";
import { requireAuth } from "../middleware/auth.js";
import {
    createUpsellValidator,
    updateUpsellValidator,
    upsellIdValidators,
    bookingIdValidator,
} from "../validators/upsell.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

// 🔒 Require authentication for all routes
router.use(requireAuth);

// 📌 Upsell Routes
router.post(
    "/booking/:bookingId",
    bookingIdValidator,
    ...createUpsellValidator,
    validate,
    createUpsell
);

router.get(
    "/booking/:bookingId",
    bookingIdValidator,
    validate,
    getUpsellsByBooking
);

router.get(
    "/booking/:bookingId/upsell/:upsellId",
    ...upsellIdValidators,
    validate,
    getUpsellById
);

router.put(
    "/booking/:bookingId/upsell/:upsellId",
    ...upsellIdValidators,
    ...updateUpsellValidator,
    validate,
    updateUpsell
);

router.delete(
    "/booking/:bookingId/upsell/:upsellId",
    ...upsellIdValidators,
    validate,
    deleteUpsell
);

export default router;
