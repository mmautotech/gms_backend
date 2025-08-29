// src/controllers/bookingController.js
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import { sendError } from "../utils/errorHandler.js";
import { saveWithCalculations } from "../utils/bookingHelpers.js";
import { BOOKING_STATUS, BOOKING_POPULATE } from "../constants/bookingConstants.js";

/**
 * --- Create Booking ---
 */
export const createBooking = async (req, res) => {
    try {
        const booking = new Booking({
            ...req.body,
            status: BOOKING_STATUS.PENDING,
            createdBy: req.user?._id,
        });

        await saveWithCalculations(booking);

        const populated = await Booking.findById(booking._id).populate(BOOKING_POPULATE);
        res.status(201).json({ success: true, booking: populated });
    } catch (error) {
        console.error("Create Booking Error:", error);
        sendError(res, 500, error.message);
    }
};

/**
 * --- Get All Bookings (with Pagination) ---
 */
export const getAllBookings = async (req, res) => {
    try {
        let { page = 1, limit = 20, sortBy = "createdAt", sortDir = "desc" } = req.query;

        page = Number(page);
        limit = Number(limit);
        const skip = (page - 1) * limit;
        const sortOrder = sortDir.toLowerCase() === "asc" ? 1 : -1;

        const [bookings, total] = await Promise.all([
            Booking.find()
                .populate(BOOKING_POPULATE)
                .skip(skip)
                .limit(limit)
                .sort({ [sortBy]: sortOrder }),
            Booking.countDocuments(),
        ]);

        res.json({
            success: true,
            data: bookings,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get All Bookings Error:", error);
        sendError(res, 500, error.message);
    }
};

/**
 * --- Get Single Booking ---
 */
export const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id))
            return sendError(res, 400, "Invalid booking ID");

        const booking = await Booking.findById(id).populate(BOOKING_POPULATE);
        if (!booking) return sendError(res, 404, "Booking not found");

        res.json({ success: true, booking });
    } catch (error) {
        console.error("Get Booking Error:", error);
        sendError(res, 500, error.message);
    }
};

/**
 * --- Update Booking (details, not status) ---
 */
export const updateBooking = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.body || Object.keys(req.body).length === 0) {
            return sendError(res, 400, "No update fields provided");
        }

        let booking = await Booking.findByIdAndUpdate(
            id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).populate(BOOKING_POPULATE);

        if (!booking) return sendError(res, 404, "Booking not found");

        // Recompute totals only if cost/services/parts/upsells changed
        const costRelatedFields = [
            "prebookingServices",
            "prebookingLabourCost",
            "prebookingPartsCost",
            "services",
            "parts",
            "upsells",
        ];

        if (Object.keys(req.body).some((f) => costRelatedFields.includes(f))) {
            await saveWithCalculations(booking);
            booking = await Booking.findById(id).populate(BOOKING_POPULATE);
        }

        res.json({ success: true, booking });
    } catch (error) {
        console.error("Update Booking Error:", error);
        sendError(res, 500, error.message);
    }
};

/**
 * --- Update Booking Status ---
 * Allowed transitions:
 * PENDING -> ARRIVED -> COMPLETED
 * PENDING -> CANCELLED
 * ARRIVED -> CANCELLED
 */
export const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id))
            return sendError(res, 400, "Invalid booking ID");
        if (!status) return sendError(res, 400, "New status is required");

        let booking = await Booking.findById(id);
        if (!booking) return sendError(res, 404, "Booking not found");

        const allowedTransitions = {
            [BOOKING_STATUS.PENDING]: [BOOKING_STATUS.ARRIVED, BOOKING_STATUS.CANCELLED],
            [BOOKING_STATUS.ARRIVED]: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED],
            [BOOKING_STATUS.COMPLETED]: [],
            [BOOKING_STATUS.CANCELLED]: [],
        };

        if (!allowedTransitions[booking.status].includes(status)) {
            return sendError(res, 400, `Invalid status transition: ${booking.status} -> ${status}`);
        }

        // --- Update status ---
        booking.status = status;
        booking.updatedBy = req.user?._id;

        // --- Automatically update timestamps and user for each status ---
        const now = new Date();
        switch (status) {
            case BOOKING_STATUS.ARRIVED:
                booking.arrivedAt = now;
                booking.arrivedBy = req.user?._id;
                break;
            case BOOKING_STATUS.COMPLETED:
                booking.completedAt = now;
                booking.completedBy = req.user?._id;
                break;
            case BOOKING_STATUS.CANCELLED:
                booking.cancelledAt = now;
                booking.cancelledBy = req.user?._id;
                break;
        }

        await booking.save();

        const populated = await Booking.findById(booking._id).populate(BOOKING_POPULATE);
        res.json({ success: true, booking: populated });
    } catch (error) {
        console.error("Update Booking Status Error:", error);
        sendError(res, 500, error.message);
    }
};
