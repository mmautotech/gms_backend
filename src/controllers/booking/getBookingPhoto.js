// src/controllers/booking/getBookingPhoto.js
import Booking from "../../models/Booking.js";
import { sendError } from "../../utils/errorHandler.js";

export const getBookingPhoto = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.query; // ?type=original|compressed

        // ✅ select hidden photo fields
        const booking = await Booking.findById(id).select(
            "+bookingConfirmationPhoto " +
            "+bookingConfirmationPhotoCompressed " +
            "+bookingConfirmationPhotoType " +
            "+bookingConfirmationPhotoCompressedType"
        );

        if (!booking) return sendError(res, 404, "Booking not found");

        // Determine which photo to return
        let photo = null;
        let mimeType = "image/jpeg";

        if (type === "original") {
            if (booking.bookingConfirmationPhoto) {
                photo = booking.bookingConfirmationPhoto;
                mimeType = booking.bookingConfirmationPhotoType || mimeType;
            }
        } else if (type === "compressed") {
            if (booking.bookingConfirmationPhotoCompressed) {
                photo = booking.bookingConfirmationPhotoCompressed;
                mimeType = booking.bookingConfirmationPhotoCompressedType || mimeType;
            }
        } else {
            // fallback: prefer original, then compressed
            if (booking.bookingConfirmationPhoto) {
                photo = booking.bookingConfirmationPhoto;
                mimeType = booking.bookingConfirmationPhotoType || mimeType;
            } else if (booking.bookingConfirmationPhotoCompressed) {
                photo = booking.bookingConfirmationPhotoCompressed;
                mimeType =
                    booking.bookingConfirmationPhotoCompressedType ||
                    booking.bookingConfirmationPhotoType ||
                    mimeType;
            }
        }

        if (!photo) return sendError(res, 404, "No photo available");

        // ✅ return raw buffer
        res.set("Content-Type", mimeType);
        res.send(Buffer.isBuffer(photo) ? photo : Buffer.from(photo));
    } catch (err) {
        console.error("GetBookingPhoto Error:", err);
        sendError(res, 500, err.message);
    }
};
