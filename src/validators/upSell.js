import { body, param, query } from "express-validator";
// ========================
// --- Upsell Validators ---
// ========================

// --- Create Upsell (at Arrival) ---
export const createUpsellValidator = [
    body("services")
        .exists().withMessage("services is required")
        .isArray({ min: 1 }).withMessage("services must be a non-empty array"),
    body("services.*")
        .isMongoId().withMessage("each service must be a valid ID"),

    body("parts")
        .optional().isArray().withMessage("parts must be an array"),
    body("parts.*")
        .isMongoId().withMessage("each part must be a valid ID"),

    body("upsellPrice")
        .exists().isFloat({ min: 0 }).withMessage("upsellPrice must be >= 0"),
    body("labourCost")
        .exists().isFloat({ min: 0 }).withMessage("labourCost must be >= 0"),
    body("partsCost")
        .exists().isFloat({ min: 0 }).withMessage("partsCost must be >= 0"),

    body("createdBy").optional().isMongoId(),
    body("updatedBy").optional().isMongoId(),
];

// --- Update Upsell ---
export const updateUpsellValidator = [
    body("services").optional().isArray(),
    body("services.*").isMongoId(),

    body("parts").optional().isArray(),
    body("parts.*").isMongoId(),

    body("upsellPrice").optional().isFloat({ min: 0 }),
    body("labourCost").optional().isFloat({ min: 0 }),
    body("partsCost").optional().isFloat({ min: 0 }),

    body("updatedBy").optional().isMongoId(),
];
