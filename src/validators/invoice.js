// validators/invoice.js
import { body, param, query } from "express-validator";

// --- GET Single Invoice (by invoiceNumber or MongoDB _id) ---
export const getInvoiceValidator = [
    param("invoiceNumber")
        .exists()
        .withMessage("Invoice identifier is required")
        .bail()
        .custom((value) => {
            // Allow either MongoDB ObjectId or invoiceNumber format INV-00001
            const objectIdRegex = /^[0-9a-fA-F]{24}$/;
            const invoiceNumberRegex = /^INV-\d{5}$/;
            if (!objectIdRegex.test(value) && !invoiceNumberRegex.test(value)) {
                throw new Error("Must be a valid invoiceNumber (INV-00001) or Mongo ID");
            }
            return true;
        }),
];

// --- GET Invoices with optional filter (e.g., by bookingId) ---
export const getInvoicesValidator = [
    query("bookingId")
        .optional()
        .isMongoId()
        .withMessage("Invalid booking ID"),
];

// --- CREATE Invoice ---
export const createInvoiceValidator = [
    body("bookingId")
        .exists()
        .withMessage("bookingId is required")
        .bail()
        .isMongoId()
        .withMessage("Invalid bookingId"),

    body("items")
        .isArray({ min: 1 })
        .withMessage("At least one invoice item is required"),

    body("items.*.serviceId")
        .exists()
        .withMessage("serviceId is required")
        .bail()
        .isMongoId()
        .withMessage("Invalid serviceId"),

    body("items.*.qty")
        .isInt({ min: 1 })
        .withMessage("Quantity must be at least 1"),

    body("items.*.rate")
        .isFloat({ min: 0 })
        .withMessage("Rate must be a positive number"),

    body("items.*.discount")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Discount must be a positive number"),

    body("vatRate")
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage("VAT rate must be between 0–100"),

    body("advanceAmount")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Advance amount must be positive"),

    body("amountReceived")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Amount received must be positive"),
];

// --- UPDATE Invoice ---
export const updateInvoiceValidator = [
    param("id")
        .exists()
        .withMessage("Invoice ID is required")
        .bail()
        .isMongoId()
        .withMessage("Invalid invoice ID"),

    body("items")
        .optional()
        .isArray({ min: 1 })
        .withMessage("Items must be an array"),

    body("items.*.serviceId")
        .optional()
        .isMongoId()
        .withMessage("Invalid serviceId"),

    body("items.*.qty")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Quantity must be at least 1"),

    body("items.*.rate")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Rate must be a positive number"),

    body("items.*.discount")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Discount must be positive"),

    body("vatRate")
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage("VAT rate must be between 0–100"),

    body("advanceAmount")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Advance amount must be positive"),

    body("amountReceived")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Amount received must be positive"),
];
