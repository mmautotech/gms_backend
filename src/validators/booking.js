import { body, param, query } from "express-validator";
import mongoose from "mongoose";

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// --- Required fields for creating a booking ---
const bookingRequiredFields = [
    body("vehicleRegNo").notEmpty().withMessage("Vehicle registration is required"),
    body("makeModel").notEmpty().withMessage("Make and model are required"),
    body("ownerName").notEmpty().withMessage("Owner name is required"),
    body("scheduledDate")
        .notEmpty()
        .isISO8601()
        .toDate()
        .withMessage("Scheduled date must be a valid ISO date"),
];

// --- Optional fields for create/update ---
const bookingOptionalFields = [
    body("vehicleRegNo").optional().isString(),
    body("makeModel").optional().isString(),
    body("ownerName").optional().isString(),
    body("ownerAddress").optional().isString(),
    body("ownerPostalCode").optional().isString().isLength({ max: 20 }),
    body("ownerNumber").optional().isString(),
    body("source").optional().isString(),
    body("scheduledDate")
        .optional()
        .isISO8601()
        .toDate()
        .custom((value) => {
            if (value < new Date()) throw new Error("Scheduled date cannot be in the past");
            return true;
        }),
    body("remarks").optional().isString().isLength({ max: 500 }),
];

// --- Cost-related fields (optional) ---
const bookingCostFields = [
    body("prebookingLabourCost").optional().isFloat({ min: 0 }),
    body("prebookingPartsCost").optional().isFloat({ min: 0 }),
    body("prebookingBookingPrice").optional().isFloat({ min: 0 }),
    body("labourCost").optional().isFloat({ min: 0 }),
    body("partsCost").optional().isFloat({ min: 0 }),
    body("bookingPrice").optional().isFloat({ min: 0 }),
];

// --- Services & Parts arrays ---
const serviceFields = [
    body("prebookingServices").optional().isArray(),
    body("prebookingServices.*").optional().isMongoId(),
    body("services").optional().isArray(),
    body("services.*").optional().isMongoId(),
    body("parts").optional().isArray(),
    body("parts.*").optional().isMongoId(),
];

// --- Validators for creating a booking ---
export const createBookingValidator = [
    ...bookingRequiredFields,
    ...bookingOptionalFields,
    ...bookingCostFields,
    ...serviceFields,
];

// --- Validators for updating a booking ---
export const updateBookingValidator = [
    param("id").custom(isObjectId).withMessage("Invalid booking ID"),

    body().custom((_, { req }) => {
        const allowedKeys = [
            "vehicleRegNo",
            "makeModel",
            "ownerName",
            "ownerAddress",
            "ownerPostalCode",
            "ownerNumber",
            "source",
            "scheduledDate",
            "remarks",
            "prebookingLabourCost",
            "prebookingPartsCost",
            "prebookingBookingPrice",
            "prebookingServices",
        ];

        const keys = Object.keys(req.body || {});
        if (!keys.some((key) => allowedKeys.includes(key))) {
            throw new Error("At least one valid field is required for update");
        }
        console.log("DEBUG BODY:", req.body);
        return true;
    }),
    ...bookingOptionalFields,
    ...bookingCostFields,
    ...serviceFields,
];

// --- Validator for updating booking status ---
export const updateBookingStatusValidator = [
    param("id").custom(isObjectId).withMessage("Invalid booking ID"),
    body("status")
        .notEmpty()
        .isIn(["pending", "arrived", "completed", "cancelled"])
        .withMessage("Invalid status"),
    body("userId").optional().custom(isObjectId).withMessage("Invalid user ID"),
];

// --- Validator for getting a booking by ID ---
export const getBookingByIdValidator = [
    param("id").custom(isObjectId).withMessage("Invalid booking ID"),
];

// --- Validator for listing bookings ---
export const listBookingValidator = [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1 }).toInt(),
    query("status").optional().isIn(["pending", "arrived", "completed", "cancelled"]),
    query("vehicleRegNo").optional().isString(),
    query("ownerName").optional().isString(),
    query("ownerPostalCode").optional().isString(),
    query("source").optional().isString(),
    query("sortBy").optional().isString(),
    query("sortDir").optional().isIn(["asc", "desc"]),
];
