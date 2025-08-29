// src/controllers/upsellController.js
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import { sendError } from "../utils/errorHandler.js";
import { saveWithCalculations } from "../utils/bookingHelpers.js";
import { BOOKING_POPULATE } from "../constants/bookingConstants.js";

/**
 * --- Helper to fetch booking by ID ---
 */
const getBookingById = async (bookingId) => {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new Error("Invalid booking ID");
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error("Booking not found");
    return booking;
};

/**
 * --- Helper to fetch upsell by ID from a booking ---
 */
const getUpsellFromBooking = (booking, upsellId) => {
    if (!mongoose.Types.ObjectId.isValid(upsellId)) throw new Error("Invalid upsell ID");
    const upsell = booking.upsells.id(upsellId);
    if (!upsell) throw new Error("Upsell not found");
    return upsell;
};

/**
 * --- Create Upsell ---
 */
export const createUpsell = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await getBookingById(bookingId);

        booking.upsells.push({
            services: req.body.serviceId ? [req.body.serviceId] : [],
            parts: req.body.partId ? [req.body.partId] : [],
            labourCost: req.body.labourCost || 0,
            partsCost: req.body.partsCost || 0,
            upsellPrice: req.body.upsellPrice || 0,
            status: req.body.status || "pending",
            createdBy: req.user?._id,
        });

        await saveWithCalculations(booking);
        const populated = await Booking.findById(booking._id).populate(BOOKING_POPULATE);
        res.status(201).json({ success: true, booking: populated });
    } catch (error) {
        console.error("Create Upsell Error:", error);
        sendError(res, 400, error.message);
    }
};

/**
 * --- Get All Upsells for a Booking ---
 */
export const getUpsellsByBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findById(bookingId).populate(BOOKING_POPULATE);
        if (!booking) return sendError(res, 404, "Booking not found");

        res.json({ success: true, upsells: booking.upsells });
    } catch (error) {
        console.error("Get Upsells Error:", error);
        sendError(res, 400, error.message);
    }
};

/**
 * --- Get Single Upsell ---
 */
export const getUpsellById = async (req, res) => {
    try {
        const { bookingId, upsellId } = req.params;
        const booking = await Booking.findById(bookingId).populate(BOOKING_POPULATE);
        if (!booking) return sendError(res, 404, "Booking not found");

        const upsell = booking.upsells.id(upsellId);
        if (!upsell) return sendError(res, 404, "Upsell not found");

        res.json({ success: true, upsell });
    } catch (error) {
        console.error("Get Upsell Error:", error);
        sendError(res, 400, error.message);
    }
};

/**
 * --- Update Upsell ---
 */
export const updateUpsell = async (req, res) => {
    try {
        const { bookingId, upsellId } = req.params;
        const booking = await getBookingById(bookingId);
        const upsell = getUpsellFromBooking(booking, upsellId);

        // Update only provided fields
        if (req.body.serviceId) upsell.services = [req.body.serviceId];
        if (req.body.partId) upsell.parts = [req.body.partId];
        if (req.body.labourCost != null) upsell.labourCost = req.body.labourCost;
        if (req.body.partsCost != null) upsell.partsCost = req.body.partsCost;
        if (req.body.upsellPrice != null) upsell.upsellPrice = req.body.upsellPrice;
        if (req.body.status) upsell.status = req.body.status;

        upsell.updatedBy = req.user?._id;

        await saveWithCalculations(booking);
        const populated = await Booking.findById(booking._id).populate(BOOKING_POPULATE);
        res.json({ success: true, booking: populated });
    } catch (error) {
        console.error("Update Upsell Error:", error);
        sendError(res, 400, error.message);
    }
};

/**
 * --- Delete Upsell ---
 */
export const deleteUpsell = async (req, res) => {
    try {
        const { bookingId, upsellId } = req.params;
        const booking = await getBookingById(bookingId);
        const upsell = getUpsellFromBooking(booking, upsellId);

        upsell.remove();
        await saveWithCalculations(booking);

        const populated = await Booking.findById(booking._id).populate(BOOKING_POPULATE);
        res.json({ success: true, booking: populated });
    } catch (error) {
        console.error("Delete Upsell Error:", error);
        sendError(res, 400, error.message);
    }
};
