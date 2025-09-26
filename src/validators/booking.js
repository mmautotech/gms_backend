// src/validators/booking.js
import { z } from "zod";
import { objectId, futureDateOnly } from "../utils/zodTypes.js";

// -----------------------------
// 📦 POST /bookings (create)
// -----------------------------
export const createBookingSchema = z.object({
    vehicleRegNo: z.string().min(1, "Vehicle registration is required"),
    makeModel: z.string().min(1, "Make and model are required"),
    ownerName: z.string().min(1, "Owner name is required"),
    ownerAddress: z.string().min(1, "Owner address is required"),
    ownerPostalCode: z.string().min(1).max(20, "Max 20 characters for postal code"),
    ownerNumber: z.string().min(5, "Owner number is too short"),
    ownerEmail: z.string().email("Invalid email format").max(100, "Email too long"),

    // ✅ Always required on create
    bookingConfirmationPhoto: z.string().startsWith("data:image/", "Must be a base64 image"),

    prebookingLabourCost: z.number().min(0, "Labour cost must be positive"),
    prebookingPartsCost: z.number().min(0, "Parts cost must be positive"),
    prebookingBookingPrice: z.number().min(0, "Booking price must be positive"),
    prebookingServices: z.array(objectId).min(1, "At least one prebooking service is required"),

    scheduledDate: futureDateOnly,
    source: z.string().min(1, "Source is required"),
    remarks: z.string().max(500, "Remarks must be under 500 characters").optional(),
});

// -----------------------------
// 📄 GET /bookings (query)
// -----------------------------
export const listBookingsQuerySchema = z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z
        .coerce.number()
        .refine((val) => [5, 25, 50, 100].includes(val), {
            message: "Limit must be one of [5, 25, 50, 100]",
        })
        .optional(),

    status: z
        .preprocess((v) => (typeof v === "string" ? v.toLowerCase() : v),
            z.enum(["pending", "arrived", "completed", "cancelled"])
        )
        .optional(),

    sortBy: z.enum([
        "createdDate",
        "scheduledDate",
        "arrivedAt",
        "cancelledAt",
        "completedAt",
        "vehicleRegNo",
        "makeModel",
        "ownerPostalCode",
        "ownerNumber",
    ]).optional(),
    sortDir: z.enum(["asc", "desc"]).optional(),

    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),

    search: z.string().optional(),

    services: z
        .string()
        .regex(/^[a-f\d]{24}(,[a-f\d]{24})*$/i, "Invalid MongoDB ObjectId(s)")
        .optional(),

    vehicleRegNo: z.string().optional(),
    ownerName: z.string().optional(),
    ownerPostalCode: z.string().optional(),
    source: z.string().optional(),
});

// -----------------------------
// 📄 GET /bookings/pending (query)
// -----------------------------
export const listPendingBookingsQuerySchema = z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z
        .coerce.number()
        .refine((val) => [5, 25, 50, 100].includes(val), {
            message: "Limit must be one of [5, 25, 50, 100]",
        })
        .optional(),

    sortBy: z.enum([
        "createdDate",     // bookingDate
        "scheduledDate",   // landingDate
        "vehicleRegNo",    // registration
        "makeModel",       // make & model
        "ownerName",       // name
        "ownerEmail",      // email
        "ownerNumber",     // phoneNumber
        "ownerPostalCode", // postCode
        "bookingPrice",    // booking price
    ]).optional(),
    sortDir: z.enum(["asc", "desc"]).optional(),

    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),

    search: z.string().optional(),
    services: z.string().optional(), // comma-separated IDs
    user: z.string().optional(),     // single userId
});

// -----------------------------
// 📄 GET /bookings/arrived (query)
// -----------------------------
export const listArrivedBookingsQuerySchema = z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number()
        .refine((val) => [5, 25, 50, 100].includes(val), {
            message: "Limit must be one of [5, 25, 50, 100]",
        })
        .optional(),

    // ✅ Sorting options
    sortBy: z.enum([
        "createdDate",    // bookingDate
        "arrivedDate",    // arrivedAt
        "vehicleRegNo",   // registration
        "makeModel",      // make & model
        "ownerName",      // owner
        "ownerEmail",     // email
        "ownerNumber",    // phone
        "ownerPostalCode",// postcode
        "bookingPrice",   // price
    ]).optional(),
    sortDir: z.enum(["asc", "desc"]).optional(),

    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),

    search: z.string().optional(),

    services: z
        .string()
        .regex(/^[a-f\d]{24}(,[a-f\d]{24})*$/i, "Invalid MongoDB ObjectId(s)")
        .optional(),

    // ✅ Additional filters
    vehicleRegNo: z.string().optional(),
    ownerName: z.string().optional(),
    ownerEmail: z.string().optional(),
    ownerNumber: z.string().optional(),
    ownerPostalCode: z.string().optional(),
    source: z.string().optional(),
    user: z.string().optional(), // createdBy
});

// -----------------------------
// 📄 GET /bookings/:id (params)
// -----------------------------
export const getBookingByIdParamSchema = z.object({
    id: objectId,
});

// -----------------------------
// 📄 GET /bookings/:id/photo (params)
// -----------------------------
export const getBookingPhotoParamSchema = z.object({
    id: objectId,
});

// -----------------------------
// 🔄 PATCH /bookings/status/:id
// -----------------------------
export const updateBookingStatusParamSchema = z.object({
    id: objectId,
});

export const updateBookingStatusBodySchema = z.object({
    status: z.enum(["pending", "arrived", "completed", "cancelled"]),
});

// -----------------------------
// ✏️ PUT /bookings/:id (update)
// -----------------------------
export const updateBookingBodySchema = z
    .object({
        vehicleRegNo: z.string().min(1).optional(),
        makeModel: z.string().min(1).optional(),
        ownerName: z.string().min(1).optional(),
        ownerAddress: z.string().min(1).optional(),
        ownerPostalCode: z.string().min(1).max(20).optional(),
        ownerNumber: z.string().min(5, "Phone number too short").optional(),
        ownerEmail: z.string().email("Invalid email format").max(100).optional(),

        // ✅ Optional on update → if present, must be valid base64 image
        bookingConfirmationPhoto: z
            .string()
            .startsWith("data:image/", "Must be a base64 image")
            .optional(),

        source: z.string().min(1).optional(),
        scheduledDate: futureDateOnly.optional(),
        remarks: z.string().max(500).optional(),

        prebookingLabourCost: z.number().min(0).optional(),
        prebookingPartsCost: z.number().min(0).optional(),
        prebookingBookingPrice: z.number().min(0).optional(),
        prebookingServices: z.array(objectId).optional(),
    })
    // ✅ At least one valid field required
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one valid field is required for update",
    });

// -----------------------------
// ✏️ PUT /bookings/:id (update params)
// -----------------------------
export const updateBookingParamSchema = z.object({
    id: objectId,
});
