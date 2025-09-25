// src/controllers/booking/createBooking.js
import sharp from "sharp";
import mongoose from "mongoose";

import Booking from "../../models/Booking.js";
import Service from "../../models/Service.js";
import { sendError } from "../../utils/errorHandler.js";
import { computeTotals } from "../../utils/bookingHelpers.js";
import { BOOKING_STATUS } from "../../constants/bookingConstants.js";

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
        const {
            prebookingServices = [],
            services = [],
            upsells = [],
            bookingConfirmationPhoto,
        } = req.body;

        // ✅ validate references
        await validateServiceIds(prebookingServices, "prebookingServices");
        await validateServiceIds(services, "services");
        for (let i = 0; i < upsells.length; i++) {
            await validateServiceIds(upsells[i]?.services || [], `upsells[${i}].services`);
        }

        let originalBuffer = null;
        let compressedBuffer = null;
        let mimeType = "image/jpeg"; // fallback

        if (bookingConfirmationPhoto?.startsWith("data:image/")) {
            const [meta, base64Data] = bookingConfirmationPhoto.split(";base64,");
            mimeType = meta.replace("data:", ""); // e.g. "image/png" | "image/jpeg"

            const buffer = Buffer.from(base64Data, "base64");

            // 🔹 Normalize and store both versions
            if (mimeType.includes("png")) {
                originalBuffer = await sharp(buffer).png({ compressionLevel: 9 }).toBuffer();
                compressedBuffer = await sharp(buffer)
                    .resize({ width: 200 })
                    .png({ compressionLevel: 9 })
                    .toBuffer();
                mimeType = "image/png";
            } else {
                originalBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
                compressedBuffer = await sharp(buffer)
                    .resize({ width: 200 })
                    .jpeg({ quality: 70 })
                    .toBuffer();
                mimeType = "image/jpeg";
            }
        }

        const booking = new Booking({
            ...req.body,
            bookingConfirmationPhoto: originalBuffer,
            bookingConfirmationPhotoCompressed: compressedBuffer,
            bookingConfirmationPhotoType: mimeType,
            status: BOOKING_STATUS.PENDING,
            createdBy: req.user?._id,
        });

        await computeTotals(booking);
        await booking.save();

        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            booking: {
                ...booking.toObject(),
                // don’t send heavy binaries in API response
                bookingConfirmationPhoto: undefined,
                bookingConfirmationPhotoCompressed: undefined,
            },
        });
    } catch (error) {
        console.error("Create Booking Error:", error);
        sendError(res, 400, error.message);
    }
};
