// validators/serviceValidator.js
import { body, param } from "express-validator";

// ✅ Create Service Validator
export const createServiceValidator = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Service name is required")
        .isLength({ min: 2, max: 50 })
        .withMessage("Service name must be between 2 and 50 characters"),

    body("enabled")
        .optional()
        .isBoolean()
        .withMessage("Enabled must be true or false"),
];

// ✅ Update Service Validator
export const updateServiceValidator = [
    param("id").isMongoId().withMessage("Invalid service ID"),

    body("name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage("Service name must be between 2 and 50 characters"),

    body("enabled")
        .optional()
        .isBoolean()
        .withMessage("Enabled must be true or false"),
];

// ✅ Delete Service Validator
export const deleteServiceValidator = [
    param("id").isMongoId().withMessage("Invalid service ID"),
];
