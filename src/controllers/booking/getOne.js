import mongoose from "mongoose";
import Booking from "../../models/Booking.js";
import { sendError } from "../../utils/errorHandler.js";
import { BOOKING_POPULATE } from "../../constants/bookingConstants.js";

export const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 400, "Invalid booking ID");
        }

        const booking = await Booking.findById(id).populate(BOOKING_POPULATE);
        if (!booking) return sendError(res, 404, "Booking not found");

        res.json({ success: true, booking });
    } catch (error) {
        console.error("Get Booking Error:", error);
        sendError(res, 500, error.message);
    }
};
