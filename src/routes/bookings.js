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
  getBookingByIdValidator,
} from "../validators/booking.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

// Apply token authentication to all routes in this router
router.use(requireAuth);

// Spread validator arrays, then validate, then controller
router.post("/", ...createBookingValidator, validate, createBooking);
router.get("/", ...listBookingValidator, validate, listBookings);
router.get("/:id", ...getBookingByIdValidator, validate, getBookingById);
router.patch("/:id", ...updateBookingValidator, validate, updateBooking);
router.patch("/status/:id", ...updateBookingStatusValidator, validate, updateBookingStatus);

export default router;
