import { body, param } from "express-validator";

export const createPartValidator = [
    body("partName")
        .notEmpty().withMessage("Part name is required")
        .isString().withMessage("Part name must be a string")
        .trim(),
    body("partNumber")
        .optional()
        .isString().withMessage("Part number must be a string")
        .trim(),
];

export const updatePartValidator = [
    param("id").isMongoId().withMessage("Invalid part ID"),
    body("partName")
        .optional()
        .isString().withMessage("Part name must be a string")
        .trim(),
    body("partNumber")
        .optional()
        .isString().withMessage("Part number must be a string")
        .trim(),
];
