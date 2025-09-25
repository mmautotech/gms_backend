// src/controllers/booking/getBookingById.js
import Booking from "../../models/Booking.js";
import { sendError } from "../../utils/errorHandler.js";

export const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await Booking.findById(id)
            .select("+bookingConfirmationPhotoCompressed +bookingConfirmationPhotoCompressedType")
            .populate("services", "name")
            .populate("createdBy", "username")
            .lean();

        if (!booking) return sendError(res, 404, "Booking not found");

        const labour = booking.labourCost || 0;
        const parts = booking.partsCost || 0;
        const price = booking.bookingPrice || 0;

        const cost = labour + parts;
        const profit = price - cost;

        // ✅ Profit % based on total cost
        const profitPercent = cost > 0 ? ((profit / cost) * 100).toFixed(1) : "0.0";

        let compressedBase64 = null;
        if (booking.bookingConfirmationPhotoCompressed) {
            compressedBase64 = `data:${booking.bookingConfirmationPhotoCompressedType || "image/jpeg"
                };base64,${booking.bookingConfirmationPhotoCompressed.toString("base64")}`;
        }

        res.json({
            success: true,
            data: {
                id: booking._id.toString(),
                ownerAddress: booking.ownerAddress || null,
                labourCost: labour,
                partsCost: parts,
                profit,
                profitPercent,
                remarks: booking.remarks || null,
                source: booking.source || null,
                compressedPhoto: compressedBase64, // ✅ preview
            },
        });
    } catch (err) {
        console.error("GetBookingById Error:", err);
        sendError(res, 500, err.message);
    }
};
