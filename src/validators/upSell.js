// src/validators/upsell.js
import { body, param } from "express-validator";
import mongoose from "mongoose";
import Service from "../models/Service.js";
import Part from "../models/Part.js";

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

export const bookingIdValidator = [
    param("bookingId").custom(isObjectId).withMessage("Invalid booking ID"),
];

export const upsellIdValidators = [
    param("bookingId").custom(isObjectId).withMessage("Invalid booking ID"),
    param("upsellId").custom(isObjectId).withMessage("Invalid upsell ID"),
];

// --- Create Upsell ---
export const createUpsellValidator = [
    body("serviceId")
        .notEmpty()
        .withMessage("serviceId is required")
        .custom(async (value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error("Invalid serviceId");
            }
            const service = await Service.findById(value);
            if (!service) {
                throw new Error("Service not found");
            }
            return true;
        }),

    body("partId")
        .optional()
        .custom(async (value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error("Invalid partId");
            }
            const part = await Part.findById(value);
            if (!part) {
                throw new Error("Part not found");
            }
            return true;
        }),

    body("partsCost")
        .notEmpty()
        .withMessage("partsCost is required")
        .isFloat({ min: 0 })
        .withMessage("partsCost must be a positive number"),

    body("labourCost")
        .notEmpty()
        .withMessage("labourCost is required")
        .isFloat({ min: 0 })
        .withMessage("labourCost must be a positive number"),

    body("upsellPrice")
        .notEmpty()
        .withMessage("upsellPrice is required")
        .isFloat({ min: 0 })
        .withMessage("upsellPrice must be a positive number"),
];

// --- Update Upsell ---
export const updateUpsellValidator = [
    body("serviceId").optional().custom(isObjectId).withMessage("Invalid serviceId"),
    body("partId").optional().custom(isObjectId).withMessage("Invalid partId"),
    body("partPrice").optional().isFloat({ min: 0 }),
    body("labourPrice").optional().isFloat({ min: 0 }),
    body("upsellPrice").optional().isFloat({ min: 0 }),
    body("status").optional().isIn(["pending", "approved", "rejected"]),
];
