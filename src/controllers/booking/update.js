// src/controllers/booking/updateBooking.js
import mongoose from "mongoose";
import sharp from "sharp";
import Booking from "../../models/Booking.js";
import Service from "../../models/Service.js";
import { sendError } from "../../utils/errorHandler.js";
import { computeTotals } from "../../utils/bookingHelpers.js";

const validateServiceIds = async (serviceIds = [], context = "services") => {
    const validIds = serviceIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const found = await Service.find({ _id: { $in: validIds } });
    const foundSet = new Set(found.map((s) => s._id.toString()));
    const invalid = validIds.filter((id) => !foundSet.has(id));
    if (invalid.length > 0) {
        throw new Error(`Invalid ${context} ID(s): ${invalid.join(", ")}`);
    }
};

export const updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 400, "Invalid booking ID");
        }
        if (!req.body || Object.keys(req.body).length === 0) {
            return sendError(res, 400, "No update fields provided");
        }

        let booking = await Booking.findById(id);
        if (!booking) return sendError(res, 404, "Booking not found");

        // ✅ Fields user is allowed to update
        const allowedUpdateFields = [
            "vehicleRegNo",
            "makeModel",
            "ownerName",
            "ownerAddress",
            "ownerPostalCode",
            "ownerNumber",
            "ownerEmail",
            "source",
            "scheduledDate",
            "remarks",
            "prebookingLabourCost",
            "prebookingPartsCost",
            "prebookingBookingPrice",
            "prebookingServices",
            "bookingConfirmationPhoto", // ✅ allow photo updates too
        ];

        // 🔹 Validate services if present
        if (req.body.hasOwnProperty("prebookingServices")) {
            await validateServiceIds(req.body.prebookingServices, "prebookingServices");
        }

        // Track whether any field actually changes
        let isModified = false;

        // 🔹 Handle booking photo update if provided
        if (
            req.body.hasOwnProperty("bookingConfirmationPhoto") &&
            req.body.bookingConfirmationPhoto?.startsWith("data:image/")
        ) {
            const [meta, base64Data] = req.body.bookingConfirmationPhoto.split(";base64,");
            let mimeType = meta.replace("data:", "");
            const buffer = Buffer.from(base64Data, "base64");

            if (mimeType.includes("png")) {
                booking.bookingConfirmationPhoto = await sharp(buffer).png({ compressionLevel: 9 }).toBuffer();
                booking.bookingConfirmationPhotoCompressed = await sharp(buffer)
                    .resize({ width: 200 })
                    .png({ compressionLevel: 9 })
                    .toBuffer();
                booking.bookingConfirmationPhotoType = "image/png";
            } else {
                booking.bookingConfirmationPhoto = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
                booking.bookingConfirmationPhotoCompressed = await sharp(buffer)
                    .resize({ width: 200 })
                    .jpeg({ quality: 70 })
                    .toBuffer();
                booking.bookingConfirmationPhotoType = "image/jpeg";
            }
            isModified = true;
        }

        // 🔹 Assign other allowed fields dynamically
        for (const key of allowedUpdateFields) {
            if (key !== "bookingConfirmationPhoto" && req.body.hasOwnProperty(key)) {
                if (booking[key]?.toString() !== req.body[key]?.toString()) {
                    booking[key] = req.body[key];
                    isModified = true;
                }
            }
        }

        booking.updatedBy = req.user?._id;

        // 🔹 Recompute totals if cost-related fields changed
        const costFields = [
            "prebookingServices",
            "prebookingLabourCost",
            "prebookingPartsCost",
            "prebookingBookingPrice",
        ];
        if (Object.keys(req.body).some((field) => costFields.includes(field))) {
            await computeTotals(booking);
            isModified = true;
        }

        // ❗ Reject save if nothing actually changed
        if (!isModified) {
            return sendError(res, 400, "No changes detected");
        }

        await booking.save({ runValidators: true });

        res.json({
            success: true,
            message: `Booking ${booking._id} updated successfully`,
        });
    } catch (error) {
        console.error("Update Booking Error:", error);
        sendError(res, 400, error.message);
    }
};
