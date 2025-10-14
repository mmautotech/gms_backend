import { z } from "zod";

// ✅ Common MongoDB ObjectId pattern
export const objectId = z
    .string()
    .regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ObjectId");

// ------------------------------------------------------------
// 📄 GET /invoices (listInvoicesQuerySchema)
// ------------------------------------------------------------
export const listInvoicesQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z
        .coerce
        .number()
        .min(1)
        .max(100)
        .refine((val) => [10, 10, 50, 100].includes(val), {
            message: "Limit must be one of 10, 10, 50, or 100",
        })
        .default(10),

    search: z.string().trim().optional().default(""),
    status: z.string().trim().optional().default(""),
    fromDate: z.string().trim().optional().default(""),
    toDate: z.string().trim().optional().default(""),

    sortOn: z
        .enum(["createdAt", "landingDate", "invoiceNo"])
        .optional()
        .default("createdAt"),

    sortOrder: z
        .enum(["asc", "desc"])
        .optional()
        .default("desc"),
});

// ------------------------------------------------------------
// 📄 GET /invoices/booking/:bookingId
// ------------------------------------------------------------
export const getInvoiceByBookingParamSchema = z.object({
    bookingId: objectId,
});

// ------------------------------------------------------------
// 📄 GET /invoices/:invoiceId/pdf  &  PUT /invoices/:invoiceId
// ------------------------------------------------------------
export const getInvoiceByIdParamSchema = z.object({
    invoiceId: objectId,
});

// ------------------------------------------------------------
// ✏️ PUT /invoices/:invoiceId (updateInvoiceBodySchema)
// ------------------------------------------------------------
export const updateInvoiceBodySchema = z
    .object({
        items: z
            .array(
                z.object({
                    description: z.string().min(1, "Description is required"),
                    amount: z.number().min(0, "Amount must be non-negative"),
                })
            )
            .optional(),

        discountAmount: z.number().min(0).optional(),
        vatIncluded: z.boolean().optional(),
        status: z.enum(["Received", "Receivable", "Partial"]).optional(),
    })
    .refine(
        (data) =>
            Object.keys(data).length > 0 &&
            (data.items ||
                data.discountAmount !== undefined ||
                data.vatIncluded !== undefined ||
                data.status),
        { message: "At least one field must be provided for update" }
    );
