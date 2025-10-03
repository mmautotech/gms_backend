import { z } from "zod";
import mongoose from "mongoose";

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

// ✅ Part ID param
export const partIdParamSchema = z.object({
    id: z.string().refine(isValidObjectId, { message: "Invalid part ID" }),
});

// ✅ Booking ID param (for /parts/by-booking/:bookingId)
export const bookingIdParamSchema = z.object({
    bookingId: z.string().refine(isValidObjectId, { message: "Invalid booking ID" }),
});

// ✅ Create schema
export const createPartBodySchema = z
    .object({
        partName: z.string().min(1, "Part name is required").trim(),
    })
    .strict();

// ✅ Update schema
export const updatePartBodySchema = z
    .object({
        partName: z.string().min(1).trim().optional(),
    })
    .strict();

// ✅ Query schema (always enforce active parts)
export const partQuerySchema = z.object({
    q: z.string().optional(),
});
