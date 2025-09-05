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

// ---------------------------
// 🔐 Apply auth to all routes
// ---------------------------
router.use(requireAuth);

// ---------------------------
// 📌 Booking CRUD
// ---------------------------

// Create a new booking
router.post(
  "/",
  ...createBookingValidator,
  validate,
  createBooking
);

// List all bookings with filters, pagination, etc.
router.get(
  "/",
  ...listBookingValidator,
  validate,
  getAllBookings
);

// Get single booking by ID
router.get(
  "/:id",
  ...getBookingByIdValidator,
  validate,
  getBookingById
);

// Update booking details (NOT status)
router.put(
  "/:id",
  ...updateBookingValidator,
  validate,
  updateBooking
);

// ---------------------------
// 🔄 Booking Status Management
// ---------------------------

// Update status (PENDING → ARRIVED → COMPLETED or CANCELLED)
router.patch(
  "/status/:id",
  ...updateBookingStatusValidator,
  validate,
  updateBookingStatus
);

export default router;
