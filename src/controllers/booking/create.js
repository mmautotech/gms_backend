import mongoose from "mongoose";
import Booking from "../../models/Booking.js";
import Service from "../../models/Service.js";

import { sendError } from "../../utils/errorHandler.js";
import { computeTotals } from "../../utils/bookingHelpers.js";
import { BOOKING_STATUS } from "../../constants/bookingConstants.js";

/**
 * Validate service IDs against DB
 */
const validateServiceIds = async (serviceIds = [], context = "services") => {
    const validIds = serviceIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const found = await Service.find({ _id: { $in: validIds } });
    const foundSet = new Set(found.map((s) => s._id.toString()));
    const invalid = validIds.filter((id) => !foundSet.has(id));

    if (invalid.length > 0) {
        throw new Error(`Invalid ${context} ID(s): ${invalid.join(", ")}`);
    }
};

export const createBooking = async (req, res) => {
    try {
        const { prebookingServices = [], services = [], upsells = [] } = req.body;

        await validateServiceIds(prebookingServices, "prebookingServices");
        await validateServiceIds(services, "services");

        for (let i = 0; i < upsells.length; i++) {
            await validateServiceIds(upsells[i]?.services || [], `upsells[${i}].services`);
        }

        const booking = new Booking({
            ...req.body,
            status: BOOKING_STATUS.PENDING,
            createdBy: req.user?._id,
        });

        await computeTotals(booking);
        await booking.save();

        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            booking,
        });
    } catch (error) {
        console.error("Create Booking Error:", error);
        sendError(res, 400, error.message);
    }
};
