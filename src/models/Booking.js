// src/models/Booking.js
import mongoose from "mongoose";

export const BOOKING_STATUS = {
    PENDING: "pending",
    ARRIVED: "arrived",
    COMPLETE: "complete",
    CANCELLED: "cancelled",
};

const moneyOpts = { type: Number, min: 0, default: 0 };

const BookingSchema = new mongoose.Schema(
    {
        carRegNo: { type: String, required: true, trim: true, index: true },
        makeModel: { type: String, required: true, trim: true },
        clientName: { type: String, required: true, trim: true },
        clientAddress: { type: String, trim: true, default: "" },
        phoneNumber: { type: String, trim: true, default: "" },

        services: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],

        scheduledArrivalDate: { type: Date, required: true },

        bookingPrice: moneyOpts,
        labourCost: moneyOpts,
        partsCost: moneyOpts,

        status: {
            type: String,
            enum: Object.values(BOOKING_STATUS),
            default: BOOKING_STATUS.PENDING,
            index: true,
        },

        arrivedAt: { type: Date },
        completedAt: { type: Date },
        cancelledAt: { type: Date },

        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        upsells: [{ type: mongoose.Schema.Types.ObjectId, ref: "Upsell" }],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// --- Virtuals ---
// Total expense = labour + parts
BookingSchema.virtual("totalExpense").get(function () {
    return (this.labourCost || 0) + (this.partsCost || 0);
});

// Profit = bookingPrice - totalExpense
BookingSchema.virtual("profit").get(function () {
    return (this.bookingPrice || 0) - this.totalExpense;
});

// Profit percentage
BookingSchema.virtual("profitPercentage").get(function () {
    if (!this.bookingPrice) return 0;
    return ((this.bookingPrice - this.totalExpense) / this.bookingPrice) * 100;
});

// --- Pre-save validation ---
BookingSchema.pre("save", function (next) {
    // Prevent editing key fields if booking is complete or cancelled
    if (!this.isNew && [BOOKING_STATUS.COMPLETE, BOOKING_STATUS.CANCELLED].includes(this.status)) {
        const changed = this.modifiedPaths();
        const forbidden = [
            "carRegNo",
            "makeModel",
            "clientName",
            "clientAddress",
            "phoneNumber",
            "services",
            "scheduledArrivalDate",
            "bookingPrice",
            "labourCost",
            "partsCost",
        ];
        if (changed.some((p) => forbidden.includes(p))) {
            return next(new Error("Completed or cancelled bookings cannot be edited."));
        }
    }
    next();
});

// --- Indexes ---
BookingSchema.index({ carRegNo: 1, status: 1 });

export default mongoose.model("Booking", BookingSchema);
