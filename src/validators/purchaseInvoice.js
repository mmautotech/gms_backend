import { z } from "zod";

/**
 * 🔹 Purchase Item Schema
 */
export const purchaseItemSchema = z.object({
    part: z.string().min(1, "Part ID is required"), // ObjectId
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
 */
export const createPurchaseInvoiceSchema = z.object({
    supplier: z.string().min(1, "Supplier ID is required"),
    booking: z.string().min(1, "Booking ID is required"),
    items: z.array(purchaseItemSchema).min(1, "At least one purchase item is required"),
    paymentDate: z.coerce.date({ required_error: "Payment date is required" }),
    discount: z.coerce.number().min(0).default(0),
    vatIncluded: z.boolean().default(true),
    vendorInvoiceNumber: z.string().min(1, "Vendor invoice number is required"),
    vendorInvoicePhoto: z.union([
        z.string().url("Must be a valid URL"),
        z.string().length(0),
        z.null(),
    ]).optional(),
    paymentStatus: z.enum(["Paid", "Partial", "Unpaid"], {
        required_error: "Payment status is required",
    }),
}).strict();

/**
 * 🔹 Update Purchase Invoice Schema (Admin only)
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
 */
export const invoiceQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),

    // ✅ only allow specific limits
    limit: z.coerce.number().refine(
        (val) => [5, 25, 50, 100].includes(val),
        { message: "Limit must be one of 5, 25, 50, or 100" }
    ).default(25),

    // Filters
    purchaser: z.string().optional(), // only used by admin
    supplier: z.string().optional(),
    booking: z.string().optional(),
    part: z.string().optional(),
    paymentStatus: z.enum(["Paid", "Partial", "Unpaid"]).optional(),

    vatIncluded: z.enum(["true", "false"])
        .transform((val) => val === "true")
        .optional(),

    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    paymentDate: z.coerce.date().optional(),

    // ✅ Sorting
    sortBy: z.enum(["paymentDate", "createdAt"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),

    // ✅ Unified search field
    search: z.string().optional(),
});
