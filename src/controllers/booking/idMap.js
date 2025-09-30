// src/controllers/booking/idMap.js
import Booking from "../../models/Booking.js";
import { sendError } from "../../utils/errorHandler.js";
import { BOOKING_STATUS } from "../../constants/bookingConstants.js";

export const getBookingIdMap = async (req, res) => {
    try {
        const bookings = await Booking.find({ status: BOOKING_STATUS.ARRIVED }) // ✅ only arrived
            .select("_id makeModel vehicleRegNo")
            .lean();

        // Map into label
        let data = bookings.map((b) => ({
            id: b._id.toString(),
            label: `${b.makeModel} (${b.vehicleRegNo})`,
        }));

        // ✅ Case-insensitive sort by label
        data.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

        res.json({
            success: true,
            count: data.length,
            data,
        });
    } catch (err) {
        console.error("getBookingIdMap Error:", err);
        sendError(res, 500, err.message);
    }
};
