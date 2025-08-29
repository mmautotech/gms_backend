// src/controllers/upsellController.js
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import { computeTotals } from "./bookingController.js"; // reuse helper

const sendError = (res, status = 500, message = "Server Error") =>
    res.status(status).json({ success: false, error: message });

const BOOKING_POPULATE = [
    { path: "services", select: "name" },
    { path: "upsells.services", select: "name" },
    { path: "upsells.parts", select: "partName partNumber" },
];

// --- Add Upsell ---
export const createUpsell = async (req, res) => {
    try {
        const { bookingId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(bookingId)) return sendError(res, 400, "Invalid booking ID");

        let booking = await Booking.findById(bookingId);
        if (!booking) return sendError(res, 404, "Booking not found");

        booking.upsells.push({ ...req.body, createdBy: req.user?._id });
        await computeTotals(booking);
        await booking.save();

        const populated = await Booking.findById(booking._id).populate(BOOKING_POPULATE);
        res.status(201).json({ success: true, booking: populated });
    } catch (error) {
        console.error("Create Upsell Error:", error);
        sendError(res, 500, error.message);
    }
};

// --- Get All Upsells ---
export const getUpsellsByBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(bookingId)) return sendError(res, 400, "Invalid booking ID");

        const booking = await Booking.findById(bookingId).populate(BOOKING_POPULATE);
        if (!booking) return sendError(res, 404, "Booking not found");

        res.json({ success: true, upsells: booking.upsells });
    } catch (error) {
        console.error("Get Upsells Error:", error);
        sendError(res, 500, error.message);
    }
};

// --- Update Upsell ---
export const updateUpsell = async (req, res) => {
    try {
        const { bookingId, upsellId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(bookingId)) return sendError(res, 400, "Invalid booking ID");

        let booking = await Booking.findById(bookingId);
        if (!booking) return sendError(res, 404, "Booking not found");

        const upsell = booking.upsells.id(upsellId);
        if (!upsell) return sendError(res, 404, "Upsell not found");

        Object.assign(upsell, req.body, { updatedBy: req.user?._id });
        await computeTotals(booking);
        await booking.save();

        const populated = await Booking.findById(booking._id).populate(BOOKING_POPULATE);
        res.json({ success: true, booking: populated });
    } catch (error) {
        console.error("Update Upsell Error:", error);
        sendError(res, 500, error.message);
    }
};

// --- Delete Upsell ---
export const deleteUpsell = async (req, res) => {
    try {
        const { bookingId, upsellId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(bookingId)) return sendError(res, 400, "Invalid booking ID");

        let booking = await Booking.findById(bookingId);
        if (!booking) return sendError(res, 404, "Booking not found");

        const upsell = booking.upsells.id(upsellId);
        if (!upsell) return sendError(res, 404, "Upsell not found");

        upsell.deleteOne();
        await computeTotals(booking);
        await booking.save();

        const populated = await Booking.findById(booking._id).populate(BOOKING_POPULATE);
        res.json({ success: true, booking: populated });
    } catch (error) {
        console.error("Delete Upsell Error:", error);
        sendError(res, 500, error.message);
    }
};
