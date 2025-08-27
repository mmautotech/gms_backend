// src/routes/bookings.js
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createBooking,
  listBookings,
  getBookingById,
  updateBooking,
  updateBookingStatus,
} from "../controllers/bookingController.js";
import {
  createBookingValidator,
  updateBookingValidator,
  updateBookingStatusValidator,
  listBookingValidator,
  getBookingByIdValidator,   // ✅ import
} from "../validators/booking.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", createBookingValidator, validate, createBooking);
router.get("/", listBookingValidator, validate, listBookings);
router.get("/:id", getBookingByIdValidator, validate, getBookingById);  // ✅ validate ID
router.patch("/:id", updateBookingValidator, validate, updateBooking);
router.patch("/status/:id", updateBookingStatusValidator, validate, updateBookingStatus);

export default router;
