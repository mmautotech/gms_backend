// src/routes/booking.js
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

import {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  updateBookingStatus,
} from "../controllers/bookingController.js";

import {
  createBookingValidator,
  updateBookingValidator,
  updateBookingStatusValidator,
  listBookingValidator,
  getBookingByIdValidator,
} from "../validators/booking.js";

const router = express.Router();

// --- All routes require authentication ---
router.use(requireAuth);

// --- Booking Routes ---
// Create a new booking
router.post("/", ...createBookingValidator, validate, createBooking);

// List bookings with pagination & filters
router.get("/", ...listBookingValidator, validate, getAllBookings);

// Get single booking by ID
router.get("/:id", ...getBookingByIdValidator, validate, getBookingById);

// Update booking details (not status)
router.patch("/:id", ...updateBookingValidator, validate, updateBooking);

// Update booking status (PENDING, ARRIVED, COMPLETED, CANCELLED)
router.patch("/status/:id", ...updateBookingStatusValidator, validate, updateBookingStatus);

export default router;
