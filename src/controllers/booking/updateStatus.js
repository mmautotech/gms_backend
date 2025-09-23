import mongoose from "mongoose";
import Booking from "../../models/Booking.js";
import { sendError } from "../../utils/errorHandler.js";
import { BOOKING_STATUS } from "../../constants/bookingConstants.js";

export const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 400, "Invalid booking ID");
        }
        if (!status) {
            return sendError(res, 400, "New status is required");
        }

        let booking = await Booking.findById(id);
        if (!booking) return sendError(res, 404, "Booking not found");

        const allowedTransitions = {
            [BOOKING_STATUS.PENDING]: [BOOKING_STATUS.ARRIVED, BOOKING_STATUS.CANCELLED],
            [BOOKING_STATUS.ARRIVED]: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED],
            [BOOKING_STATUS.COMPLETED]: [],
            [BOOKING_STATUS.CANCELLED]: [],
        };

        if (!allowedTransitions[booking.status].includes(status)) {
            return sendError(res, 400, `Invalid status transition: ${booking.status} → ${status}`);
        }

        const userId = req.user?._id;
        const userName = req.user?.username || "Unknown user";
        const now = new Date();

        booking.status = status;
        booking.updatedBy = userId;

        switch (status) {
            case BOOKING_STATUS.ARRIVED:
                booking.arrivedAt = now;
                booking.arrivedBy = userId;
                break;
            case BOOKING_STATUS.COMPLETED:
                booking.completedAt = now;
                booking.completedBy = userId;
                break;
            case BOOKING_STATUS.CANCELLED:
                booking.cancelledAt = now;
                booking.cancelledBy = userId;
                break;
        }

        await booking.save({ allowEdit: true });

        return res.json({
            success: true,
            message: `Marked as ${status} by ${userName}`,
            booking,
        });
    } catch (error) {
        console.error("Update Booking Status Error:", error);
        sendError(res, 500, error.message);
    }
};
