// src/validators/purchaseInvoice.js
import { z } from "zod";
import mongoose from "mongoose";

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

/**
 * ✅ Purchase Item Schema
 */
const purchaseItemSchema = z.object({
    part: z.string().refine(isValidObjectId, { message: "Invalid part ID" }),
    rate: z
        .number({ required_error: "Rate is required" })
        .min(0, "Rate cannot be negative")
        .refine((val) => /^\d+(\.\d{1,2})?$/.test(val.toString()), {
            message: "Rate can have up to 2 decimal places",
        }),
    quantity: z
        .number({ required_error: "Quantity is required" })
        .min(1, "Quantity must be at least 1"),
});

/**
 * ✅ Create Invoice Schema
 */
export const createPurchaseInvoiceSchema = z
    .object({
        supplier: z
            .string()
            .refine(isValidObjectId, { message: "Invalid supplier ID" }),
        items: z
            .array(purchaseItemSchema)
            .min(1, "At least one purchase item is required")
            .refine(
                (val) => {
                    const partIds = val.map((i) => i.part);
                    return partIds.length === new Set(partIds).size;
                },
                { message: "Each part must be unique within an invoice" }
            ),
        paymentDate: z.coerce.date({
            required_error: "Payment date is required",
        }),
        discount: z
            .number()
            .min(0, "Discount cannot be negative")
            .max(999999, "Discount too large")
            .optional()
            .default(0),
        vatIncluded: z.boolean().optional().default(false),
        vendorInvoiceNumber: z.string().optional(),
        vendorInvoicePhoto: z
            .string()
            .url("Vendor invoice photo must be a valid URL")
            .nullable()
            .optional(),
        paymentStatus: z
            .enum(["Paid", "Partial", "Pending"])
            .optional()
            .default("Pending"),
    })
    .strict();

/**
 * ✅ Update Invoice Schema (Admin only)
 */
export const updatePurchaseInvoiceSchema =
    createPurchaseInvoiceSchema.partial().strict();

/**
 * ✅ Update Payment Status Schema (User & Admin)
 */
export const updateInvoiceStatusSchema = z.object({
    paymentStatus: z.enum(["Paid", "Partial", "Pending"], {
        required_error: "Payment status is required",
    }),
});

/**
 * ✅ ID param schema
 */
export const invoiceIdParamSchema = z.object({
    id: z.string().refine(isValidObjectId, { message: "Invalid invoice ID" }),
});

/**
 * ✅ Query Schema (filters + pagination + sorting)
 */
export const invoiceQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),

    purchaser: z
        .string()
        .refine(isValidObjectId, { message: "Invalid purchaser ID" })
        .optional(),
    supplier: z
        .string()
        .refine(isValidObjectId, { message: "Invalid supplier ID" })
        .optional(),
    part: z
        .string()
        .refine(isValidObjectId, { message: "Invalid part ID" })
        .optional(),
    partNumber: z.string().optional(),

    status: z.enum(["Paid", "Partial", "Pending"]).optional(),
    vatIncluded: z
        .enum(["true", "false"])
        .transform((val) => val === "true")
        .optional(),

    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    paymentDate: z.coerce.date().optional(),

    sortBy: z.enum(["price", "invoiceDate", "paymentDate"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
});
