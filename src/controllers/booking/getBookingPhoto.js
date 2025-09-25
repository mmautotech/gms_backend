// src/controllers/booking/getBookingPhoto.js
import Booking from "../../models/Booking.js";
import { sendError } from "../../utils/errorHandler.js";

export const getBookingPhoto = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.query; // ?type=original|compressed (optional)

        // ✅ explicitly select hidden buffer fields
        const booking = await Booking.findById(id)
            .select(
                "+bookingConfirmationPhoto " +
                "+bookingConfirmationPhotoCompressed " +
                "+bookingConfirmationPhotoType " +
                "+bookingConfirmationPhotoCompressedType"
            );

        if (!booking) return sendError(res, 404, "Booking not found");

        let photo = null;
        let mimeType = "image/jpeg";

        // --- priority based on query ---
        if (type === "compressed" && booking.bookingConfirmationPhotoCompressed) {
            photo = booking.bookingConfirmationPhotoCompressed;
            mimeType = booking.bookingConfirmationPhotoCompressedType || mimeType;
        } else if (type === "original" && booking.bookingConfirmationPhoto) {
            photo = booking.bookingConfirmationPhoto;
            mimeType = booking.bookingConfirmationPhotoType || mimeType;
        } else {
            // --- fallback logic ---
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

        // ✅ Ensure raw binary buffer is returned
        res.set("Content-Type", mimeType);
        res.send(Buffer.isBuffer(photo) ? photo : Buffer.from(photo));
    } catch (err) {
        console.error("GetBookingPhoto Error:", err);
        sendError(res, 500, err.message);
    }
};
