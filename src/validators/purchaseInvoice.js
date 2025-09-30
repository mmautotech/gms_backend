// src/validators/purchaseInvoice.js
import { z } from "zod";

/**
 * 🔹 Purchase Item Schema
 * - part: ObjectId string
 * - rate: number (2 decimals max)
 * - quantity: positive integer
 */
export const purchaseItemSchema = z.object({
    part: z.string().min(1, "Part ID is required"), // ObjectId reference
    rate: z.coerce.number()
        .min(0, "Rate cannot be negative")
        .refine(
            (val) => /^\d+(\.\d{1,2})?$/.test(val.toString()),
            { message: "Rate can have up to 2 decimal places" }
        ),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
});

/**
 * 🔹 Create Purchase Invoice Schema
 * - booking is required (one booking can have many invoices)
 */
export const createPurchaseInvoiceSchema = z.object({
    supplier: z.string().min(1, "Supplier ID is required"),
    booking: z.string().min(1, "Booking ID is required"),
    items: z.array(purchaseItemSchema).min(1, "At least one purchase item is required"),
    paymentDate: z.coerce.date({ required_error: "Payment date is required" }),
    discount: z.coerce.number().min(0).default(0),
    vatIncluded: z.boolean().default(true),
    vendorInvoiceNumber: z.string().min(1, "Vendor invoice number is required"),
    vendorInvoicePhoto: z.union([z.string().url("Must be a valid URL"), z.string().length(0), z.null()]).optional(),
    paymentStatus: z.enum(["Paid", "Partial", "Unpaid"], {
        required_error: "Payment status is required",
    }),
}).strict();

/**
 * 🔹 Update Purchase Invoice Schema (Admin only)
 * - All fields optional
 * - Extra fields disallowed
 */
export const updatePurchaseInvoiceSchema = createPurchaseInvoiceSchema.partial().strict();

/**
 * 🔹 Update Payment Status Schema (User self-update)
 */
export const updateInvoiceStatusSchema = z.object({
    paymentStatus: z.enum(["Paid", "Partial", "Unpaid"], {
        required_error: "Payment status is required",
    }),
});

/**
 * 🔹 Invoice ID Param Schema
 */
export const invoiceIdParamSchema = z.object({
    id: z.string().min(1, "Invoice ID is required"),
});

/**
 * 🔹 Invoice Query Schema (filters, pagination, sorting)
 * - booking is optional (can return many invoices for the same booking)
 */
export const invoiceQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),

    purchaser: z.string().optional(),
    supplier: z.string().optional(),
    booking: z.string().optional(),   // ✅ allows fetching multiple invoices per booking
    part: z.string().optional(),      // ✅ filter invoices by part ID

    paymentStatus: z.enum(["Paid", "Partial", "Unpaid"]).optional(),
    vatIncluded: z.enum(["true", "false"])
        .transform((val) => val === "true")
        .optional(),

    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    paymentDate: z.coerce.date().optional(),

    sortBy: z.enum(["paymentDate", "createdAt", "updatedAt"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
});
