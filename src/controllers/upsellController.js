// src/controllers/upsellController.js
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import { sendError } from "../utils/errorHandler.js";
import { saveWithCalculations } from "../utils/bookingHelpers.js";
import { BOOKING_POPULATE } from "../constants/bookingConstants.js";
import sharp from "sharp";

// Helper: get booking safely
const getBookingById = async (id) => {
    const booking = await Booking.findById(id);
    if (!booking) throw new Error("Booking not found");
    return booking;
};

export const createUpsell = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await getBookingById(bookingId);

        // 📸 Process upsell photo inline
        let originalBuffer = null;
        let compressedBuffer = null;
        let mimeType = "image/jpeg"; // default

        if (req.body.upsellConfirmationPhoto?.startsWith("data:image/")) {
            const [meta, base64Data] = req.body.upsellConfirmationPhoto.split(";base64,");
            mimeType = meta.replace("data:", "");
            const buffer = Buffer.from(base64Data, "base64");

            if (mimeType.includes("png")) {
                originalBuffer = await sharp(buffer).png({ compressionLevel: 9 }).toBuffer();
                compressedBuffer = await sharp(buffer)
                    .resize({ width: 200 })
                    .png({ compressionLevel: 9 })
                    .toBuffer();
            } else {
                originalBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
                compressedBuffer = await sharp(buffer)
                    .resize({ width: 200 })
                    .jpeg({ quality: 70 })
                    .toBuffer();
                mimeType = "image/jpeg";
            }
        }

        // 📌 Push upsell with photo directly
        booking.upsells.push({
            services: req.body.serviceId ? [req.body.serviceId] : [],
            labourCost: req.body.labourCost || 0,
            partsCost: req.body.partsCost || 0,
            upsellPrice: req.body.upsellPrice || 0,
            status: req.body.status || "pending",
            createdBy: req.user?._id,
            upsellConfirmationPhoto: originalBuffer,
            upsellConfirmationPhotoCompressed: compressedBuffer,
            upsellConfirmationPhotoType: mimeType,
        });

        await saveWithCalculations(booking);

        const populated = await Booking.findById(booking._id).populate(BOOKING_POPULATE);
        res.status(201).json({ success: true, booking: populated });
    } catch (error) {
        console.error("Create Upsell Error:", error);
        sendError(res, 400, error.message);
    }
};


/**
 * --- Get All Sells for a Booking ---
 */
export const getSellsByBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId)
            .populate("prebookingServices", "name")
            .populate("services", "name")
            .lean();

        if (!booking) return sendError(res, 404, "Booking not found");

        // Populate upsell services only
        const populatedUpsells = await Promise.all(
            (booking.upsells || []).map(async (upsell) => {
                const services = await Service.find(
                    { _id: { $in: upsell.services || [] } },
                    "_id name"
                );

                const { _id, labourCost, partsCost, upsellPrice, status, createdBy, updatedAt, createdAt } = upsell;
                return { _id, services, labourCost, partsCost, upsellPrice, status, createdBy, updatedAt, createdAt };
            })
        );

        const result = {
            success: true,

            // Prebooking details
            prebookingServices: booking.prebookingServices || [],
            prebookingLabourCost: booking.prebookingLabourCost || 0,
            prebookingPartsCost: booking.prebookingPartsCost || 0,
            prebookingBookingPrice: booking.prebookingBookingPrice || 0,

            // Upsells
            upsells: populatedUpsells,

            // Final booking totals
            services: booking.services || [],
            partsCost: booking.partsCost || 0,
            labourCost: booking.labourCost || 0,
            bookingPrice: booking.bookingPrice || 0,
        };

        res.json(result);
    } catch (error) {
        console.error("Get Booking + Upsells Error:", error);
        sendError(res, 400, error.message);
    }
};



export const getUpsellPhoto = async (req, res) => {
    try {
        const { bookingId, upsellId } = req.params;
        const { type } = req.query; // optional: original | compressed

        // ✅ Select upsell photo fields explicitly
        const booking = await Booking.findById(bookingId).select(
            "+upsells.upsellConfirmationPhoto " +
            "+upsells.upsellConfirmationPhotoCompressed " +
            "+upsells.upsellConfirmationPhotoType"
        );

        if (!booking) return sendError(res, 404, "Booking not found");

        // Find the specific upsell
        const upsell = booking.upsells.id(upsellId);
        if (!upsell) return sendError(res, 404, "Upsell not found");

        let photo = null;
        let mimeType = "image/jpeg";

        // Determine which photo to return
        if (type === "compressed" && upsell.upsellConfirmationPhotoCompressed) {
            photo = upsell.upsellConfirmationPhotoCompressed;
            mimeType = upsell.upsellConfirmationPhotoType || mimeType;
        } else {
            // default or original
            if (upsell.upsellConfirmationPhoto) {
                photo = upsell.upsellConfirmationPhoto;
                mimeType = upsell.upsellConfirmationPhotoType || mimeType;
            } else if (upsell.upsellConfirmationPhotoCompressed) {
                photo = upsell.upsellConfirmationPhotoCompressed;
                mimeType = upsell.upsellConfirmationPhotoType || mimeType;
            }
        }

        if (!photo) return sendError(res, 404, "No photo available");

        // ✅ Return raw binary
        res.set("Content-Type", mimeType);
        res.send(Buffer.isBuffer(photo) ? photo : Buffer.from(photo));
    } catch (err) {
        console.error("GetUpsellPhoto Error:", err);
        sendError(res, 500, err.message);
    }
};