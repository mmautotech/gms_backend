// src/utils/zodTypes.js
import { z } from "zod";
import mongoose from "mongoose";

// ✅ ObjectId validator (MongoDB)
export const objectId = z
    .string()
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid ObjectId",
    });

// ✅ Future date validator
export const futureDateOnly = z
    .string()
    .refine((val) => {
        const d = new Date(val);
        const today = new Date();
        // remove time part for comparison
        today.setHours(0, 0, 0, 0);
        return !isNaN(d.getTime()) && d > today;
    }, {
        message: "Date must be a valid future date",
    });
