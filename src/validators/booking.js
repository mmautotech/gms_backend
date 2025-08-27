// src/validators/bookingValidator.js
import { body, param, query } from "express-validator";
import mongoose from "mongoose";
import { BOOKING_STATUS } from "../models/Booking.js";

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

// CREATE Booking
export const createBookingValidator = [
    body("carRegNo")
        .trim()
        .notEmpty().withMessage("Car registration number is required"),

    body("makeModel")
        .trim()
        .notEmpty().withMessage("Car make & model is required"),

    body("clientName")
        .trim()
        .notEmpty().withMessage("Client name is required"),

    body("scheduledArrivalDate")
        .notEmpty().withMessage("Scheduled arrival date is required")
        .isISO8601().withMessage("Scheduled arrival date must be a valid date"),

    body("bookingPrice").optional().isFloat({ min: 0 }).withMessage("Booking price must be ≥ 0"),
    body("labourCost").optional().isFloat({ min: 0 }).withMessage("Labour cost must be ≥ 0"),
    body("partsCost").optional().isFloat({ min: 0 }).withMessage("Parts cost must be ≥ 0"),

    body("services").optional().isArray().withMessage("Services must be an array of IDs"),
    body("services.*").optional().custom(isValidObjectId).withMessage("Invalid service ID"),
];

// UPDATE Booking
export const updateBookingValidator = [
    param("id").custom(isValidObjectId).withMessage("Invalid booking ID"),

    body("carRegNo").optional().notEmpty().withMessage("Car registration number cannot be empty"),
    body("makeModel").optional().notEmpty().withMessage("Car make & model cannot be empty"),
    body("clientName").optional().notEmpty().withMessage("Client name cannot be empty"),
    body("scheduledArrivalDate").optional().isISO8601().withMessage("Must be a valid date"),

    body("bookingPrice").optional().isFloat({ min: 0 }).withMessage("Booking price must be ≥ 0"),
    body("labourCost").optional().isFloat({ min: 0 }).withMessage("Labour cost must be ≥ 0"),
    body("partsCost").optional().isFloat({ min: 0 }).withMessage("Parts cost must be ≥ 0"),

    body("services").optional().isArray().withMessage("Services must be an array"),
    body("services.*").optional().custom(isValidObjectId).withMessage("Invalid service ID"),
];

// UPDATE STATUS
export const updateBookingStatusValidator = [
    param("id").custom(isValidObjectId).withMessage("Invalid booking ID"),
    body("action")
        .notEmpty().withMessage("Action is required")
        .isIn(["arrived", "complete", "cancel"]).withMessage("Invalid status action"),
];

// LIST Bookings (filters)
export const listBookingValidator = [
    query("status").optional().isIn(Object.values(BOOKING_STATUS)).withMessage("Invalid status filter"),
    query("regNo").optional().isString(),
    query("from").optional().isISO8601().withMessage("From must be a valid date"),
    query("to").optional().isISO8601().withMessage("To must be a valid date"),
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be ≥ 1"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
];

// GET by ID
export const getBookingByIdValidator = [
    param("id").custom(isValidObjectId).withMessage("Invalid booking ID"),
];