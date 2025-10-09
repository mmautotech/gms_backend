// src/validators/internalInvoice.js
import { z } from "zod";

/**
 * ✅ Create Internal Invoice Schema
 * Used for POST /api/internal-invoices
 */
export const createInternalInvoiceSchema = z.object({
    invoiceId: z
        .string({ required_error: "invoiceId is required" })
        .trim()
        .min(1, "Invoice ID cannot be empty")
        .regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ObjectId format"),
    purchaseInvoiceIds: z.array(z.string()).optional().default([]),
});

/**
 * ✅ Flexible Date Validator
 * Allows "" or valid YYYY-MM-DD (ISO) format
 */
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const flexibleDate = z
    .string()
    .optional()
    .refine(
        (val) =>
            !val ||
            val === "" ||
            dateRegex.test(val),
        { message: "Invalid date format (expected YYYY-MM-DD)" }
    );

/**
 * ✅ Query Schema for GET /api/internal-invoices
 * Supports pagination, search, status, date range, and sorting
 */
export const listInternalInvoicesQuerySchema = z.object({
    // 🔢 Pagination
    page: z
        .string()
        .regex(/^\d+$/, "Page must be a valid number")
        .transform((val) => Number(val))
        .optional()
        .default("1"),

    limit: z
        .string()
        .regex(/^\d+$/, "Limit must be a valid number")
        .transform((val) => Number(val))
        .optional()
        .refine((val) => val > 0 && val <= 200, {
            message: "Limit must be between 1 and 200",
        })
        .default("25"),

    // 🔍 Universal search across invoiceNo, customerName, vehicleRegNo, makeModel
    search: z.string().optional().default(""),

    // 🧾 Invoice status filter (case-insensitive)
    status: z.string().optional().default(""),

    // 📅 Date range filters
    fromDate: flexibleDate,
    toDate: flexibleDate,

    // ⚙️ Sorting options
    sortOn: z
        .enum(["landingDate", "createDate"])
        .optional()
        .default("landingDate"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

/**
 * ✅ Param Schema for ID-based routes
 * Used for GET /:id and GET /:id/pdf/view
 */
export const internalInvoiceIdParamSchema = z.object({
    id: z
        .string({ required_error: "ID is required" })
        .regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ObjectId"),
});
