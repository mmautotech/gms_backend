// src/controllers/bookingController.js
import mongoose from "mongoose";
import Booking, { BOOKING_STATUS } from "../models/Booking.js";

const sendError = (res, status = 500, message = "Server Error") =>
    res.status(status).json({ success: false, error: message });

const BOOKING_POPULATE = [
    { path: "services", select: "name" },
    { path: "upsells.services", select: "name" },
    { path: "upsells.parts", select: "partName partNumber" },
    { path: "createdBy", select: "name email" },
    { path: "updatedBy", select: "name email" },
    { path: "arrivedBy", select: "name email" },
    { path: "completedBy", select: "name email" },
    { path: "cancelledBy", select: "name email" },
];

// --- Helper: compute totals ---
async function computeTotals(booking) {
    let totalLabour = booking.originalLabourCost || 0;
    let totalParts = booking.originalPartsCost || 0;
    let totalUpsellServices = 0;
    let totalUpsellParts = 0;

    for (const upsell of booking.upsells || []) {
        totalLabour += upsell.labourCost || 0;
        totalParts += upsell.partsCost || 0;
        totalUpsellServices += (upsell.services?.length || 0);
        totalUpsellParts += (upsell.parts?.length || 0);
    }

    const totalServices = (booking.services?.length || 0) + totalUpsellServices;

    booking.labourCost = totalLabour;
    booking.partsCost = totalParts;
    booking.bookingPrice = totalLabour + totalParts;
    booking.totalServices = totalServices;
    booking.totalParts = totalUpsellParts;

    return booking;
}

async function saveWithCalculations(booking) {
    await computeTotals(booking);
    return booking.save();
}

// --- Create Booking ---
export const createBooking = async (req, res) => {
    try {
        const data = req.body;

        if ((data.originalLabourCost ?? 0) < 0 || (data.originalPartsCost ?? 0) < 0) {
            return sendError(res, 400, "Costs cannot be negative");
        }

        let booking = await Booking.create({ ...data, createdBy: req.user?._id });
        booking = await saveWithCalculations(booking);

        const populated = await Booking.findById(booking._id).populate(BOOKING_POPULATE);
        res.status(201).json({ success: true, booking: populated });
    } catch (error) {
        console.error("Create Booking Error:", error);
        sendError(res, 500, error.message);
    }
};

// --- Update Booking (Prebooking) ---
export const updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return sendError(res, 400, "Invalid booking ID");

        let booking = await Booking.findById(id);
        if (!booking) return sendError(res, 404, "Booking not found");
        if ([BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED].includes(booking.status)) {
            return sendError(res, 400, "Completed or cancelled bookings cannot be updated");
        }

        Object.assign(booking, req.body, { updatedBy: req.user?._id });
        booking = await saveWithCalculations(booking);

        const populated = await Booking.findById(booking._id).populate(BOOKING_POPULATE);
        res.json({ success: true, booking: populated });
    } catch (error) {
        console.error("Update Booking Error:", error);
        sendError(res, 500, error.message);
    }
};

// --- Update Booking Status ---
export const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, userId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) return sendError(res, 400, "Invalid booking ID");
        if (!Object.values(BOOKING_STATUS).includes(status)) return sendError(res, 400, "Invalid status value");

        let booking = await Booking.findById(id);
        if (!booking) return sendError(res, 404, "Booking not found");

        const now = new Date();
        const updateData = { status, updatedBy: req.user?._id };

        if (status === BOOKING_STATUS.ARRIVED) {
            updateData.arrivedAt = now;
            updateData.arrivedBy = userId;
        } else if (status === BOOKING_STATUS.COMPLETED) {
            updateData.completedAt = now;
            updateData.completedBy = userId;
        } else if (status === BOOKING_STATUS.CANCELLED) {
            updateData.cancelledAt = now;
            updateData.cancelledBy = userId;
            booking.labourCost = 0;
            booking.partsCost = 0;
            booking.bookingPrice = 0;
        }

        Object.assign(booking, updateData);
        booking = await saveWithCalculations(booking);

        const populated = await Booking.findById(booking._id).populate(BOOKING_POPULATE);
        res.json({ success: true, booking: populated });
    } catch (error) {
        console.error("Update Booking Status Error:", error);
        sendError(res, 500, error.message);
    }
};

// --- Get Single Booking ---
export const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return sendError(res, 400, "Invalid booking ID");

        const booking = await Booking.findById(id).populate(BOOKING_POPULATE);
        if (!booking) return sendError(res, 404, "Booking not found");

        res.json({ success: true, booking });
    } catch (error) {
        console.error("Get Booking Error:", error);
        sendError(res, 500, error.message);
    }
};

// --- List Bookings ---
export const listBookings = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, carRegNo, clientName, sortBy = "createdAt", sortDir = "desc" } = req.query;

        const query = {};
        if (status) query.status = status;
        if (carRegNo) query.carRegNo = { $regex: carRegNo, $options: "i" };
        if (clientName) query.clientName = { $regex: clientName, $options: "i" };

        const skip = (page - 1) * limit;
        const sortOrder = sortDir.toLowerCase() === "asc" ? 1 : -1;

        const [bookings, total] = await Promise.all([
            Booking.find(query).populate(BOOKING_POPULATE).skip(skip).limit(Number(limit)).sort({ [sortBy]: sortOrder }),
            Object.keys(query).length ? Booking.countDocuments(query) : Booking.estimatedDocumentCount(),
        ]);

        res.json({
            success: true,
            data: bookings,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("List Bookings Error:", error);
        sendError(res, 500, error.message);
    }
};
