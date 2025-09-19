// src/controllers/upsellController.js
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import { sendError } from "../utils/errorHandler.js";
import { saveWithCalculations } from "../utils/bookingHelpers.js";
import { BOOKING_POPULATE } from "../constants/bookingConstants.js";

// Helper: get booking safely
const getBookingById = async (id) => {
    const booking = await Booking.findById(id);
    if (!booking) throw new Error("Booking not found");
    return booking;
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
 * --- Get All Sells for a Booking ---
 */
export const getSellsByBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId)
            .populate("prebookingServices", "name")
            .populate("services", "name")
            .lean();

        if (!booking) return sendError(res, 404, "Booking not found");

        // Populate upsell services only
        const populatedUpsells = await Promise.all(
            (booking.upsells || []).map(async (upsell) => {
                const services = await Service.find(
                    { _id: { $in: upsell.services || [] } },
                    "_id name"
                );

                const { _id, labourCost, partsCost, upsellPrice, status, createdBy, updatedAt, createdAt } = upsell;
                return { _id, services, labourCost, partsCost, upsellPrice, status, createdBy, updatedAt, createdAt };
            })
        );

        const result = {
            success: true,

            // Prebooking details
            prebookingServices: booking.prebookingServices || [],
            prebookingLabourCost: booking.prebookingLabourCost || 0,
            prebookingPartsCost: booking.prebookingPartsCost || 0,
            prebookingBookingPrice: booking.prebookingBookingPrice || 0,

            // Upsells
            upsells: populatedUpsells,

            // Final booking totals
            services: booking.services || [],
            partsCost: booking.partsCost || 0,
            labourCost: booking.labourCost || 0,
            bookingPrice: booking.bookingPrice || 0,
        };

        res.json(result);
    } catch (error) {
        console.error("Get Booking + Upsells Error:", error);
        sendError(res, 400, error.message);
    }
};
