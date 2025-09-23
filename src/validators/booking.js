import { z } from "zod";

// -----------------------------
// 🔗 Shared Validators
// -----------------------------

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ObjectId");

export const futureDateOnly = z
    .preprocess((val) => {
        if (!val) return undefined;
        const d = new Date(val);
        return isNaN(d) ? undefined : d;
    }, z.date())
    .refine((date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
    }, { message: "Scheduled date cannot be in the past" });

// -----------------------------
// 📦 POST /bookings (create)
// -----------------------------

export const createBookingSchema = z.object({
    vehicleRegNo: z.string().min(1, "Vehicle registration is required"),
    makeModel: z.string().min(1, "Make and model are required"),
    ownerName: z.string().min(1, "Owner name is required"),
    ownerAddress: z.string().min(1, "Owner address is required"),
    ownerPostalCode: z.string().min(1).max(20, "Max 20 characters for postal code"),
    ownerNumber: z.string().min(1, "Owner number is required"),
    ownerEmail: z.string().email("Invalid email format").max(100, "Email too long"),
    bookingConfirmationPhoto: z
        .string()
        .startsWith("data:image/", "Must be a base64 image"),

    prebookingLabourCost: z.number().min(0, "Labour cost must be positive"),
    prebookingPartsCost: z.number().min(0, "Parts cost must be positive"),
    prebookingBookingPrice: z.number().min(0, "Booking price must be positive"),
    prebookingServices: z
        .array(objectId)
        .min(1, "At least one prebooking service is required"),

    scheduledDate: futureDateOnly,
    source: z.string().min(1, "Source is required"),
    remarks: z.string().max(500, "Remarks must be under 500 characters").optional(),
});

// -----------------------------
// 📄 GET /bookings (query)
// -----------------------------
export const listBookingsQuerySchema = z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number()
        .refine((val) => [5, 25, 50, 100].includes(val), {
            message: "Limit must be one of [5, 25, 50, 100]",
        })
        .optional(),

    status: z
        .preprocess((v) => (typeof v === "string" ? v.toLowerCase() : v),
            z.enum(["pending", "arrived", "completed", "cancelled"])
        )
        .optional(),

    // ✅ include createdDate
    sortBy: z.enum([
        "createdDate",
        "scheduledDate",
        "arrivedDate",
        "cancelledDate",
        "completedDate",
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
    limit: z.coerce.number()
        .refine((val) => [5, 25, 50, 100].includes(val), {
            message: "Limit must be one of [5, 25, 50, 100]",
        })
        .optional(),

    sortBy: z.enum([
        "createdDate",     // bookingDate
        "scheduledDate",
        "vehicleRegNo",    // registration
        "ownerNumber",     // phoneNumber
        "ownerPostalCode", // postCode
        "bookingPrice",
        "createdBy"
    ]).optional(),
    sortDir: z.enum(["asc", "desc"]).optional(),

    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),

    search: z.string().optional(),
});


// -----------------------------
// 📄 GET /bookings/:id (params)
// -----------------------------

export const getBookingByIdParamSchema = z.object({
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
    userId: objectId.optional(),
});

// -----------------------------
// ✏️ PUT /bookings/:id (update)
// -----------------------------

export const updateBookingParamSchema = z.object({
    id: objectId,
});

export const updateBookingBodySchema = z
    .object({
        vehicleRegNo: z.string().optional(),
        makeModel: z.string().optional(),
        ownerName: z.string().optional(),
        ownerAddress: z.string().optional(),
        ownerPostalCode: z.string().max(20).optional(),
        ownerNumber: z.string().optional(),
        ownerEmail: z.string().email("Invalid email format").max(100).optional(),
        bookingConfirmationPhoto: z
            .string()
            .startsWith("data:image/", "Must be a base64 image"),

        source: z.string().optional(),
        scheduledDate: futureDateOnly.optional(),
        remarks: z.string().max(500).optional(),

        prebookingLabourCost: z.number().min(0).optional(),
        prebookingPartsCost: z.number().min(0).optional(),
        prebookingBookingPrice: z.number().min(0).optional(),
        prebookingServices: z.array(objectId).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one valid field is required for update",
    });
