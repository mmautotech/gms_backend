// src/routes/booking.js
import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateWithZod } from "../middleware/zodMiddleware.js";
import {
  createBookingSchema,
  listBookingsQuerySchema,
  getBookingByIdParamSchema,
  getBookingPhotoParamSchema,
  updateBookingBodySchema,
  updateBookingParamSchema,
  updateBookingStatusParamSchema,
  updateBookingStatusBodySchema,
  listPendingBookingsQuerySchema,
  listArrivedBookingsQuerySchema,
} from "../validators/booking.js";
import {
  createBooking,
  getAllBookings,
  getAllPendingBookings,
  getBookingById,
  getBookingPhoto,
  updateBooking,
  updateBookingStatus,
  exportBookings,
  getAllArrivedBookings
} from "../controllers/booking/index.js";

const router = express.Router();

// ---------------------------
// 🔐 Auth required for all booking routes
// ---------------------------
router.use(requireAuth);

// Admin-only export
router.get(
  "/export",
  requireRole("admin"),
  exportBookings
);

// ---------------------------
// 📌 Booking CRUD
// ---------------------------

// Create booking
router.post(
  "/",
  validateWithZod(createBookingSchema),
  createBooking
);

// List all bookings
router.get(
  "/",
  validateWithZod(listBookingsQuerySchema, "query"),
  getAllBookings
);

// List pending bookings only
router.get(
  "/pending",
  validateWithZod(listPendingBookingsQuerySchema, "query"),
  getAllPendingBookings
);

// 👇 NEW: List arrived bookings only
router.get(
  "/arrived",
  validateWithZod(listArrivedBookingsQuerySchema, "query"), // reuse validation
  getAllArrivedBookings
);

// Get single booking
router.get(
  "/:id",
  validateWithZod(getBookingByIdParamSchema, "params"),
  getBookingById
);

// Get single booking photo
router.get(
  "/:id/photo",
  validateWithZod(getBookingPhotoParamSchema, "params"),
  getBookingPhoto
);

// Update booking
router.put(
  "/:id",
  validateWithZod(updateBookingParamSchema, "params"),
  validateWithZod(updateBookingBodySchema),
  updateBooking
);

// ---------------------------
// 🔄 Booking Status Management
// ---------------------------

// Update status
router.patch(
  "/status/:id",
  validateWithZod(updateBookingStatusParamSchema, "params"),
  validateWithZod(updateBookingStatusBodySchema),
  updateBookingStatus
);

export default router;
