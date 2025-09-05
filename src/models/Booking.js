import mongoose from "mongoose";
import { BOOKING_STATUS, VALIDATION_LIMITS } from "../constants/bookingConstants.js";

const { ObjectId } = mongoose.Schema.Types;
const moneyOpts = { type: Number, min: 0, default: 0 };

// --- Upsell Schema ---
const upsellSchema = new mongoose.Schema(
    {
        services: [{ type: ObjectId, ref: "Service", required: true, default: [] }],
        parts: [{ type: ObjectId, ref: "Part", default: [] }],
        labourCost: moneyOpts,
        partsCost: moneyOpts,
        upsellPrice: moneyOpts,
        createdBy: { type: ObjectId, ref: "User" },
        updatedBy: { type: ObjectId, ref: "User" },
    },
    { timestamps: true }
);

// --- Booking Schema ---
const BookingSchema = new mongoose.Schema(
    {
        vehicleRegNo: { type: String, required: true, trim: true, index: true },
        makeModel: { type: String, required: true, trim: true, maxlength: 100 },
        ownerName: {
            type: String,
            required: true,
            trim: true,
            maxlength: VALIDATION_LIMITS.ownerNameMaxLength,
        },
        ownerAddress: {
            type: String,
            trim: true,
            default: "",
            maxlength: VALIDATION_LIMITS.ownerAddressMaxLength,
        },
        ownerPostalCode: {
            type: String,
            trim: true,
            default: "",
            maxlength: VALIDATION_LIMITS.ownerPostalCodeMaxLength,
        },
        ownerNumber: { type: String, trim: true, default: "" },
        scheduledDate: { type: Date, required: true },
        remarks: {
            type: String,
            trim: true,
            default: "",
            maxlength: VALIDATION_LIMITS.remarksMaxLength,
        },

        prebookingServices: [{ type: ObjectId, ref: "Service", default: [] }],
        prebookingLabourCost: moneyOpts,
        prebookingPartsCost: moneyOpts,
        prebookingBookingPrice: moneyOpts,

        services: [{ type: ObjectId, ref: "Service", default: [] }],
        parts: [{ type: ObjectId, ref: "Part", default: [] }],

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
        arrivedBy: { type: ObjectId, ref: "User" },
        completedAt: Date,
        completedBy: { type: ObjectId, ref: "User" },
        cancelledAt: Date,
        cancelledBy: { type: ObjectId, ref: "User" },

        createdBy: { type: ObjectId, ref: "User" },
        updatedBy: { type: ObjectId, ref: "User" },

        upsells: { type: [upsellSchema], default: [] },

        source: { type: String, trim: true, default: "" },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            versionKey: false,
            transform(doc, ret) {
                ret.id = ret._id.toString();
                delete ret._id;

                // Remove computed virtuals from output
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

// Track original status to enforce edit restrictions
BookingSchema.pre("init", function (doc) {
    this._originalStatus = doc.status;
});

// Prevent edits to COMPLETED or CANCELLED bookings unless explicitly allowed
BookingSchema.pre("save", function (next, options) {
    const isFinal = [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED].includes(this.status);
    if (!this.isNew && isFinal && this.isModified() && !options?.allowEdit) {
        if (
            this._originalStatus &&
            [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED].includes(this._originalStatus)
        ) {
            return next(
                new Error("Completed or cancelled bookings cannot be edited unless explicitly allowed.")
            );
        }
    }
    next();
});

// Composite index for faster status-based lookups
BookingSchema.index({ vehicleRegNo: 1, status: 1 });

export default mongoose.model("Booking", BookingSchema);
