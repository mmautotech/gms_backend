import { z } from "zod";
import mongoose from "mongoose";

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

// ✅ ID param
export const partIdParamSchema = z.object({
    id: z
        .string()
        .refine((val) => isValidObjectId(val), { message: "Invalid part ID" }),
});

// ✅ Create schema
export const createPartBodySchema = z
    .object({
        partName: z.string().min(1, "Part name is required").trim(),

        partNumber: z.preprocess(
            (val) => (val === "" ? null : val),
            z.string().trim().nullable().optional()
        ),

        price: z.preprocess(
            (val) => (typeof val === "string" ? Number(val) : val),
            z
                .number({ required_error: "Price is required" })
                .min(0, "Price cannot be negative")
                .refine((val) => /^\d+(\.\d{1,2})?$/.test(val.toString()), {
                    message: "Price can have up to two decimal places",
                })
        ),

        description: z.preprocess(
            (val) => (typeof val === "string" ? val.trim() : val),
            z.string().optional().nullable()
        ),
    })
    .strict();

// ✅ Update schema (all optional)
export const updatePartBodySchema = createPartBodySchema.partial().strict();

// ✅ Query schema
export const partQuerySchema = z.object({
    q: z.string().optional(),
    includeInactive: z
        .string()
        .optional()
        .transform((val) => val === "true"),
    onlyInactive: z
        .string()
        .optional()
        .transform((val) => val === "true"),
});
