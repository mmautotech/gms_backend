import express from "express";
import {
    createUpsell,
    getUpsellsByBooking,
    getUpsellById,
    updateUpsell,
    deleteUpsell,
} from "../controllers/upsellController.js";
import { requireAuth } from "../middleware/auth.js";
import { createUpsellValidator, updateUpsellValidator } from "../validators/upsell.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.use(requireAuth); // applies to all routes

router.post("/booking/:bookingId", ...createUpsellValidator, validate, createUpsell);
router.put("/:bookingId/:upsellId", ...updateUpsellValidator, validate, updateUpsell);
router.get("/booking/:bookingId", getUpsellsByBooking);
router.get("/:bookingId/:upsellId", getUpsellById);
router.delete("/:bookingId/:upsellId", deleteUpsell);

export default router;
