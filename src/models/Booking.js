// src/models/Booking.js
import mongoose from "mongoose";

export const BOOKING_STATUS = {
    PENDING: "pending",
    ARRIVED: "arrived",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
};

const moneyOpts = { type: Number, min: 0, default: 0 };

// --- Upsell Schema ---
const upsellSchema = new mongoose.Schema(
    {
        services: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true }],
        parts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Part" }],
        labourCost: moneyOpts,
        partsCost: moneyOpts,
        upsellPrice: moneyOpts,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

// --- Booking Schema ---
const BookingSchema = new mongoose.Schema(
    {
        vehicleRegNo: { type: String, required: true, trim: true, index: true },
        makeModel: { type: String, required: true, trim: true },
        ownerName: { type: String, required: true, trim: true },
        ownerAddress: { type: String, trim: true, default: "" },
        ownerNumber: { type: String, trim: true, default: "" },
        scheduledDate: { type: Date, required: true },
        remarks: { type: String, default: "" },

        prebookingServices: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
        prebookingLabourCost: moneyOpts,
        prebookingPartsCost: moneyOpts,
        prebookingBookingPrice: moneyOpts,

        services: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service", default: [] }],
        parts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Part", default: [] }],

        labourCost: moneyOpts,
        partsCost: moneyOpts,
        bookingPrice: moneyOpts,

        status: {
            type: String,
            enum: Object.values(BOOKING_STATUS),
            default: BOOKING_STATUS.PENDING,
            index: true,
        },

        arrivedAt: Date,
        arrivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        completedAt: Date,
        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        cancelledAt: Date,
        cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        upsells: [upsellSchema],
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            versionKey: false,
            transform(doc, ret) {
                ret.id = ret._id.toString();
                delete ret._id;

                // Remove virtuals from response
                delete ret.totalExpense;
                delete ret.profit;
                delete ret.profitPercentage;
                delete ret.totalServices;
                delete ret.totalParts;

                return ret;
            },
        },
        toObject: { virtuals: true, versionKey: false },
    }
);

// --- Pre-save validation ---
BookingSchema.pre("save", function (next, options) {
    const isFinal = [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED].includes(this.status);
    if (!this.isNew && isFinal && !options?.allowEdit) {
        return next(new Error("Completed or cancelled bookings cannot be edited unless explicitly allowed."));
    }
    next();
});

// --- Indexes ---
BookingSchema.index({ vehicleRegNo: 1, status: 1 });

export default mongoose.model("Booking", BookingSchema);
