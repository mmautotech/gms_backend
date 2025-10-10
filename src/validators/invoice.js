// ../validators/invoice.js
import { z } from "zod";

export const objectId = z
    .string()
    .regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ObjectId");

// 📄 GET /invoices
export const listInvoicesQuerySchema = z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    search: z.string().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    status: z.string().optional(),
    sortOn: z.string().optional(),
    sortOrder: z.string().optional(),
});

// 📄 GET /invoices/booking/:bookingId
export const getInvoiceByBookingParamSchema = z.object({
    bookingId: objectId,
});

// 📄 GET /invoices/:invoiceId/pdf  &  PUT /invoices/:invoiceId
export const getInvoiceByIdParamSchema = z.object({
    invoiceId: objectId,
});

// ✏️ PUT /invoices/:invoiceId
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
