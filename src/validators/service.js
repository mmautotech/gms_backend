// validators/service.js
import { body, param } from "express-validator";

// helper for ObjectId
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// ✅ Create Service Validator
export const createServiceValidator = [
    body("name")
        .trim()
        .notEmpty().withMessage("Service name is required")
        .isLength({ min: 2, max: 50 }).withMessage("Service name must be between 2 and 50 characters"),

    body("enabled")
        .optional()
        .isBoolean().withMessage("Enabled must be true or false"),

    body("parts")
        .optional()
        .isArray().withMessage("Parts must be an array of ObjectIds"),

    body("parts.*")
        .optional()
        .matches(objectIdRegex).withMessage("Each part must be a valid ObjectId"),
];

// ✅ Update Service Validator
export const updateServiceValidator = [
    param("id").isMongoId().withMessage("Invalid service ID"),

    body("name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage("Service name must be between 2 and 50 characters"),

    body("enabled")
        .optional()
        .isBoolean().withMessage("Enabled must be true or false"),

    body("parts")
        .optional()
        .isArray().withMessage("Parts must be an array of ObjectIds"),

    body("parts.*")
        .optional()
        .matches(objectIdRegex).withMessage("Each part must be a valid ObjectId"),
];

// ✅ Soft Delete Service Validator
export const deleteServiceValidator = [param("id").isMongoId().withMessage("Invalid service ID")];

// ✅ Reactivate Service Validator
export const activateServiceValidator = [param("id").isMongoId().withMessage("Invalid service ID")];

// ✅ Get Service Parts Validator
export const getServicePartsValidator = [param("id").isMongoId().withMessage("Invalid service ID")];

// ✅ Get Service By ID Validator
export const getServiceByIdValidator = [param("id").isMongoId().withMessage("Invalid service ID")];
