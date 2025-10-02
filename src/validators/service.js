// validators/service.js
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

    body("parts")
        .optional()
        .isArray()
        .withMessage("Parts must be an array of ObjectIds"),
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

    body("parts")
        .optional()
        .isArray()
        .withMessage("Parts must be an array of ObjectIds"),
];

// ✅ Soft Delete Service Validator
export const deleteServiceValidator = [
    param("id").isMongoId().withMessage("Invalid service ID"),
];

// ✅ Reactivate Service Validator
export const activateServiceValidator = [
    param("id").isMongoId().withMessage("Invalid service ID"),
];

// ✅ Get Service Parts Validator
export const getServicePartsValidator = [
    param("id").isMongoId().withMessage("Invalid service ID"),
];

// ✅ Add Parts Validator (single OR multiple)
export const addPartsValidator = [
    param("id").isMongoId().withMessage("Invalid service ID"),
    body().custom((body) => {
        if (!body.partId && !body.partIds) {
            throw new Error("Either partId or partIds is required");
        }
        if (body.partId && !/^[0-9a-fA-F]{24}$/.test(body.partId)) {
            throw new Error("Invalid partId");
        }
        if (body.partIds) {
            if (!Array.isArray(body.partIds) || body.partIds.length === 0) {
                throw new Error("partIds must be a non-empty array");
            }
            body.partIds.forEach((id) => {
                if (!/^[0-9a-fA-F]{24}$/.test(id)) {
                    throw new Error(`Invalid ObjectId in partIds: ${id}`);
                }
            });
        }
        return true;
    }),
];

// ✅ Remove Parts Validator (same as add)
export const removePartsValidator = addPartsValidator;
