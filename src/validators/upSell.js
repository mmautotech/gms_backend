// src/validators/upsell.js
import { z } from "zod";
import mongoose from "mongoose";

// Helper: check valid MongoDB ObjectId
const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

// Schema: BookingId + UpsellId from route params
export const bookingIdParamSchema = z.object({
    bookingId: z.string().refine(isValidObjectId, {
        message: "Invalid booking ID",
    }),
});

export const upsellParamsSchema = bookingIdParamSchema.extend({
    upsellId: z.string().refine(isValidObjectId, {
        message: "Invalid upsell ID",
    }),
});

// Schema: Create Upsell Body
// Schema: Create Upsell Body
export const createUpsellBodySchema = z.object({
    serviceId: z.string().refine(isValidObjectId, { message: "Invalid serviceId" }),
    partId: z.string().refine(isValidObjectId, { message: "Invalid partId" }).optional(),
    partsCost: z.number().min(0, "partsCost must be positive"),
    labourCost: z.number().min(0, "labourCost must be positive"),
    upsellPrice: z.number().min(0, "upsellPrice must be positive"),
    status: z.enum(["pending", "approved", "rejected"]).optional(),

    // ✅ Now required
    upsellConfirmationPhoto: z
        .string()
        .startsWith("data:image/", "Must be a base64 image")
        .min(10, "upsellConfirmationPhoto cannot be empty"),
});

// Schema: Update Upsell Body (all optional)
export const updateUpsellBodySchema = z
    .object({
        serviceId: z.string().refine(isValidObjectId, {
            message: "Invalid serviceId",
        }).optional(),

        partId: z.string().refine(isValidObjectId, {
            message: "Invalid partId",
        }).optional(),

        partsCost: z.number().min(0).optional(),
        labourCost: z.number().min(0).optional(),
        upsellPrice: z.number().min(0).optional(),
        status: z.enum(["pending", "approved", "rejected"]).optional(),
    })
    .strict(); // prevents unknown keys
