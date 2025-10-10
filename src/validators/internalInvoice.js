import { z } from "zod";

/**
 * ✅ Common MongoDB ObjectId validator
 */
const objectId = z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ObjectId format")
    .describe("Valid MongoDB ObjectId (24 hex chars)");

/**
 * ✅ Create Internal Invoice Schema
 * Used for POST /api/internal-invoices
 */
export const createInternalInvoiceSchema = z
    .object({
        invoiceId: objectId.nonempty("invoiceId is required"),
        purchaseInvoiceIds: z.array(objectId).optional().default([]),
    })
    .strict()
    .describe("Schema for creating or updating internal invoices");

/**
 * ✅ Flexible Date Validator
 * Allows "" or valid YYYY-MM-DD format
 */
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const flexibleDate = z
    .string()
    .optional()
    .refine((val) => !val || val === "" || dateRegex.test(val), {
        message: "Invalid date format (expected YYYY-MM-DD)",
    })
    .describe("Flexible ISO date or empty string");

/**
 * ✅ Query Schema for GET /api/internal-invoices
 * Supports pagination, search, status, date range, and sorting
 */
export const listInternalInvoicesQuerySchema = z
    .object({
        // 🔢 Pagination
        page: z
            .string()
            .regex(/^\d+$/, "Page must be a valid number")
            .transform((val) => Number(val))
            .refine((val) => val >= 1, { message: "Page must be at least 1" })
            .optional()
            .default("1"),

        limit: z
            .string()
            .regex(/^\d+$/, "Limit must be a valid number")
            .transform((val) => Number(val))
            .refine((val) => val > 0 && val <= 200, {
                message: "Limit must be between 1 and 200",
            })
            .optional()
            .default("25"),

        // 🔍 Universal Search
        search: z.string().trim().optional().default(""),

        // 🧾 Status Filter (matches your system logic)
        status: z
            .enum(["", "Partial", "Receivable", "Received", "Cancelled"])
            .optional()
            .default(""),

        // 📅 Date Filters
        fromDate: flexibleDate,
        toDate: flexibleDate,

        // ⚙️ Sorting Options
        sortOn: z
            .enum(["landingDate", "createDate", "updatedAt"])
            .optional()
            .default("landingDate"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
    })
    .strict()
    .describe("Query parameters for listing internal invoices");

/**
 * ✅ Param Schema for ID-based routes
 * Used for:
 * - GET /api/internal-invoices/:id
 * - GET /api/internal-invoices/:id/pdf/view
 */
export const internalInvoiceIdParamSchema = z
    .object({
        id: objectId.nonempty("Internal Invoice ID is required"),
    })
    .strict()
    .describe("Path parameter schema for internal invoice ID");

/**
 * ✅ Query Schema for Single Internal Invoice Retrieval
 * Used for optional future expansions:
 * ?withDetails=true&includePurchases=false
 */
export const internalInvoiceDetailQuerySchema = z
    .object({
        withDetails: z
            .string()
            .optional()
            .transform((v) => v === "true")
            .default("true"),
        includePurchases: z
            .string()
            .optional()
            .transform((v) => v === "true")
            .default("true"),
    })
    .strict()
    .describe("Optional query toggles for fetching internal invoice details");
