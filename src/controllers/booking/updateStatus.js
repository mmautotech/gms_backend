// src/controllers/bookings/updateBookingStatus.js
import mongoose from "mongoose";
import Booking from "../../models/Booking.js";
import Invoice from "../../models/Invoice.js"; // ✅ add import
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

        const normalizedStatus = status.toLowerCase();
        let booking = await Booking.findById(id);
        if (!booking) return sendError(res, 404, "Booking not found");

        const allowedTransitions = {
            [BOOKING_STATUS.PENDING]: [BOOKING_STATUS.ARRIVED, BOOKING_STATUS.CANCELLED],
            [BOOKING_STATUS.ARRIVED]: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED],
            [BOOKING_STATUS.COMPLETED]: [],
            [BOOKING_STATUS.CANCELLED]: [],
        };

        if (!allowedTransitions[booking.status].includes(normalizedStatus)) {
            return sendError(
                res,
                400,
                `Invalid status transition: ${booking.status} → ${normalizedStatus}`
            );
        }

        // 🚫 Prevent marking as COMPLETED if no invoice exists
        if (normalizedStatus === BOOKING_STATUS.COMPLETED) {
            const invoiceExists = await Invoice.exists({ booking: booking._id });
            if (!invoiceExists) {
                return sendError(
                    res,
                    400,
                    "Please generate an invoice before marking this booking as completed."
                );
            }
        }

        const previousStatus = booking.status;
        const userId = req.user?._id;
        const userName = req.user?.username || "Unknown user";
        const now = new Date();

        // Update booking
        booking.status = normalizedStatus;
        booking.updatedBy = userId;

        switch (normalizedStatus) {
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

        // ✅ Emit socket updates to all connected clients
        const io = req.app.get("io");

        // Broadcast general status change
        io.emit("booking:statusChanged", {
            _id: booking._id,
            status: booking.status,
            updatedBy: userName,
            booking,
        });

        // 🚗 Special logic for PreBooking ↔ CarIn transition
        if (previousStatus === BOOKING_STATUS.PENDING && normalizedStatus === BOOKING_STATUS.ARRIVED) {
            io.emit("booking:removedFromPreBooking", { _id: booking._id });
            io.emit("booking:addedToCarIn", booking);
        }

        if (previousStatus === BOOKING_STATUS.ARRIVED && normalizedStatus === BOOKING_STATUS.COMPLETED) {
            io.emit("booking:removedFromCarIn", { _id: booking._id });
        }

        return res.json({
            success: true,
            message: `Marked as ${normalizedStatus} by ${userName}`,
        });
    } catch (error) {
        console.error("Update Booking Status Error:", error);
        sendError(res, 500, error.message);
    }
};
