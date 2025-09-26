// src/validators/purchaseInvoice.js
import { z } from "zod";

/**
 * ✅ Purchase Item Schema
 * Now uses partName instead of ObjectId
 */
const purchaseItemSchema = z.object({
    partName: z.string().min(1, "Part name is required"),
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
        supplier: z.string().min(1, "Supplier ID is required"),
        vehicleRegNo: z.string().min(1, "Vehicle registration number is required"),
        booking: z.string().optional(), // <-- Booking reference added
        items: z
            .array(purchaseItemSchema)
            .min(1, "At least one purchase item is required"),
        paymentDate: z.coerce.date({ required_error: "Payment date is required" }),
        discount: z.number().min(0).optional().default(0),
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
    id: z.string().min(1, "Invoice ID is required"),
});

/**
 * ✅ Query Schema (filters + pagination + sorting)
 */
export const invoiceQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),

    purchaser: z.string().optional(),
    supplier: z.string().optional(),
    booking: z.string().optional(), // <-- filter by booking
    partName: z.string().optional(),

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