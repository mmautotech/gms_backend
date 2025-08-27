import { body, param } from "express-validator";

export const createSupplierValidator = [
    body("name")
        .notEmpty().withMessage("Supplier name is required")
        .isString().withMessage("Supplier name must be a string")
        .trim(),
    body("contact")
        .notEmpty().withMessage("Contact is required")
        .isString().withMessage("Contact must be a string")
        .trim(),
    body("bankAccount")
        .notEmpty().withMessage("Bank account is required")
        .isString().withMessage("Bank account must be a string")
        .trim(),
    body("email")
        .optional()
        .isEmail().withMessage("Invalid email format")
        .trim()
        .normalizeEmail(),
    body("address")
        .optional()
        .isString().withMessage("Address must be a string")
        .trim(),
];

export const updateSupplierValidator = [
    param("id").isMongoId().withMessage("Invalid supplier ID"),
    body("name")
        .optional()
        .isString().withMessage("Supplier name must be a string")
        .trim(),
    body("contact")
        .optional()
        .isString().withMessage("Contact must be a string")
        .trim(),
    body("bankAccount")
        .optional()
        .isString().withMessage("Bank account must be a string")
        .trim(),
    body("email")
        .optional()
        .isEmail().withMessage("Invalid email format")
        .trim()
        .normalizeEmail(),
    body("address")
        .optional()
        .isString().withMessage("Address must be a string")
        .trim(),
];
