import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { validateWithZod } from "../middleware/zodMiddleware.js";
import {
  createBookingSchema,
  listBookingsQuerySchema,
  getBookingByIdParamSchema,
  updateBookingBodySchema,
  updateBookingParamSchema,
  updateBookingStatusParamSchema,
  updateBookingStatusBodySchema,
} from "../validators/booking.js";
import {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  updateBookingStatus,
} from "../controllers/bookingController.js";

const router = express.Router();

// ---------------------------
// 🔐 Auth required for all booking routes
// ---------------------------
router.use(requireAuth);

// ---------------------------
// 📌 Booking CRUD
// ---------------------------

// POST /bookings → Create a booking
router.post(
  "/",
  validateWithZod(createBookingSchema),
  createBooking
);

// GET /bookings → List bookings with filters
router.get(
  "/",
  validateWithZod(listBookingsQuerySchema, "query"),
  getAllBookings
);

// GET /bookings/:id → Fetch a single booking
router.get(
  "/:id",
  validateWithZod(getBookingByIdParamSchema, "params"),
  getBookingById
);

// PUT /bookings/:id → Update booking fields
router.put(
  "/:id",
  validateWithZod(updateBookingParamSchema, "params"),
  validateWithZod(updateBookingBodySchema),
  updateBooking
);

// ---------------------------
// 🔄 Booking Status Management
// ---------------------------

// PATCH /bookings/status/:id → Update status (ARRIVED, COMPLETED, CANCELLED)
router.patch(
  "/status/:id",
  validateWithZod(updateBookingStatusParamSchema, "params"),
  validateWithZod(updateBookingStatusBodySchema),
  updateBookingStatus
);

export default router;
