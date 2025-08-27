import { body, param } from "express-validator";

export const createUpsellValidator = [
    body("bookingId")
        .notEmpty().withMessage("Booking ID is required")
        .isMongoId().withMessage("Invalid booking ID"),
    body("partId")
        .notEmpty().withMessage("Part ID is required")
        .isMongoId().withMessage("Invalid part ID"),
    body("partPrice")
        .notEmpty().withMessage("Part price is required")
        .isFloat({ min: 0 }).withMessage("Part price must be a positive number"),
    body("labourPrice")
        .notEmpty().withMessage("Labour price is required")
        .isFloat({ min: 0 }).withMessage("Labour price must be a positive number"),
    body("supplierId")
        .optional()
        .isMongoId().withMessage("Invalid supplier ID"),
];

export const updateUpsellValidator = [
    param("id").isMongoId().withMessage("Invalid upsell ID"),
    body("partId").optional().isMongoId().withMessage("Invalid part ID"),
    body("partPrice").optional().isFloat({ min: 0 }).withMessage("Price must be positive"),
    body("labourPrice").optional().isFloat({ min: 0 }).withMessage("Labour must be positive"),
    body("supplierId").optional().isMongoId().withMessage("Invalid supplier ID"),
];
