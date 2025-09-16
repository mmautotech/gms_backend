import { z } from "zod";
import mongoose from "mongoose";

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

// Supplier ID param schema
export const supplierIdParamSchema = z.object({
    id: z.string().refine(isValidObjectId, {
        message: "Invalid supplier ID",
    }),
});

// Create supplier schema
export const createSupplierBodySchema = z
    .object({
        name: z.string().min(1, "Supplier name is required"),
        contact: z.string().min(1, "Contact is required"),
        bankAccount: z.string().min(1, "Bank account is required"),
        address: z.string().optional(),
        email: z.string().email("Invalid email format").optional(),
    })
    .strict();

// Update supplier schema
export const updateSupplierBodySchema = z
    .object({
        name: z.string().min(1).optional(),
        contact: z.string().min(1).optional(),
        bankAccount: z.string().min(1).optional(),
        address: z.string().optional(),
        email: z.string().email("Invalid email format").optional(),
    })
    .strict();

// Query schema
export const supplierQuerySchema = z.object({
    includeInactive: z
        .string()
        .optional()
        .transform((val) => val === "true"),
});
