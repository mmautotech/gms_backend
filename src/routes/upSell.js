import express from "express";
import {
    createUpsell,
    getUpsellsByBooking,
    getUpsellById,
    updateUpsell,
    deleteUpsell,
} from "../controllers/upsellController.js";
import { requireAuth } from "../middleware/auth.js";
import { createUpsellValidator, updateUpsellValidator } from "../validators/upSell.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

// Create upsell
router.post("/", requireAuth, createUpsellValidator, validate, createUpsell);

// Get all upsells for booking
router.get("/booking/:bookingId", requireAuth, getUpsellsByBooking);

// Get single upsell
router.get("/:id", requireAuth, getUpsellById);

// Update upsell
router.put("/:id", requireAuth, updateUpsellValidator, validate, updateUpsell);

// Delete upsell
router.delete("/:id", requireAuth, deleteUpsell);

export default router;
