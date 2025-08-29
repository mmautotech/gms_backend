// --- Create Booking ---
export const createBookingValidator = [
    body("vehicleRegNo").exists().isString().withMessage("vehicleRegNo is required"),
    body("makeModel").exists().isString().withMessage("makeModel is required"),
    body("vehicleOwner").exists().isString().withMessage("vehicleOwner is required"),
    body("ownerAddress").optional().isString(),
    body("ownerContact").optional().isString(),
    body("scheduledDate").exists().isISO8601().toDate().withMessage("scheduledDate is required"),

    body("originalBookingPrice").optional().isFloat({ min: 0 }),
    body("originalLabourCost").optional().isFloat({ min: 0 }),
    body("originalPartsCost").optional().isFloat({ min: 0 }),

    body("services").optional().isArray(),
    body("services.*").isMongoId().withMessage("each service must be a valid ID"),
];

// --- Update Booking ---
export const updateBookingValidator = [
    param("id").isMongoId().withMessage("Invalid booking ID"),
    body("vehicleRegNo").optional().isString(),
    body("makeModel").optional().isString(),
    body("vehicleOwner").optional().isString(),
    body("ownerAddress").optional().isString(),
    body("ownerContact").optional().isString(),
    body("scheduledDate").optional().isISO8601().toDate(),

    body("originalBookingPrice").optional().isFloat({ min: 0 }),
    body("originalLabourCost").optional().isFloat({ min: 0 }),
    body("originalPartsCost").optional().isFloat({ min: 0 }),

    body("services").optional().isArray(),
    body("services.*").isMongoId(),
];

// --- Update Booking Status ---
export const updateBookingStatusValidator = [
    param("id").isMongoId().withMessage("Invalid booking ID"),
    body("status").exists().isIn(["pending", "arrived", "completed", "cancelled"]),
];

// --- List Bookings ---
export const listBookingValidator = [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1 }).toInt(),
    query("status").optional().isIn(["pending", "arrived", "completed", "cancelled"]),
    query("vehicleRegNo").optional().isString(),
    query("vehicleOwner").optional().isString(),
];

// --- Get Booking by ID ---
export const getBookingByIdValidator = [
    param("id").isMongoId().withMessage("Invalid booking ID"),
];
