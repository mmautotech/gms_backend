import mongoose from "mongoose";
import { BOOKING_STATUS, VALIDATION_LIMITS } from "../constants/bookingConstants.js";

const { ObjectId } = mongoose.Schema.Types;
const moneyOpts = { type: Number, min: 0, default: 0 };

// --- Upsell Schema ---
const upsellSchema = new mongoose.Schema(
    {
        services: [{ type: ObjectId, ref: "Service", required: true, default: [] }],
        labourCost: moneyOpts,
        partsCost: moneyOpts,
        upsellPrice: moneyOpts,
        createdBy: { type: ObjectId, ref: "User" },
        updatedBy: { type: ObjectId, ref: "User" },

        // 📸 Upsell Confirmation Photo
        upsellConfirmationPhoto: { type: Buffer, select: false },
        upsellConfirmationPhotoCompressed: { type: Buffer, select: false },
        upsellConfirmationPhotoType: { type: String, default: "image/jpeg" },
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
            required: true,
            maxlength: VALIDATION_LIMITS.ownerAddressMaxLength,
        },
        ownerPostalCode: {
            type: String,
            trim: true,
            required: true,
            maxlength: VALIDATION_LIMITS.ownerPostalCodeMaxLength,
        },
        ownerEmail: {
            type: String,
            trim: true,
            lowercase: true,
            required: true,
        },
        ownerNumber: { type: String, trim: true, required: true },
        scheduledDate: { type: Date, required: true },
        remarks: {
            type: String,
            trim: true,
            default: "",
            maxlength: VALIDATION_LIMITS.remarksMaxLength,
        },

        // Prebooking
        prebookingServices: [{ type: ObjectId, ref: "Service", default: [] }],
        prebookingLabourCost: { ...moneyOpts, required: true },
        prebookingPartsCost: { ...moneyOpts, required: true },
        prebookingBookingPrice: { ...moneyOpts, required: true },

        // 📸 Photos stored in DB
        bookingConfirmationPhoto: {
            type: Buffer,
            required: true,
            select: false,   // <-- optional safeguard
        },
        bookingConfirmationPhotoCompressed: {
            type: Buffer,
            required: true,
            select: false,
        },
        bookingConfirmationPhotoType: {
            type: String, // e.g. "image/jpeg"
            default: "image/jpeg",
        },

        // Services & parts
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

        // Status lifecycle
        arrivedAt: Date,
        arrivedBy: { type: ObjectId, ref: "User" },
        completedAt: Date,
        completedBy: { type: ObjectId, ref: "User" },
        cancelledAt: Date,
        cancelledBy: { type: ObjectId, ref: "User" },

        createdBy: { type: ObjectId, ref: "User", required: true },
        updatedBy: { type: ObjectId, ref: "User" },

        upsells: { type: [upsellSchema], default: [] },

        source: { type: String, trim: true, required: true },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            versionKey: false,
            transform(doc, ret) {
                ret.id = ret._id.toString();
                delete ret._id;

                // Strip heavy binary data from default JSON response
                delete ret.bookingConfirmationPhoto;
                delete ret.bookingConfirmationPhotoCompressed;

                return ret;
            },
        },
        toObject: { virtuals: true, versionKey: false },
    }
);

// Track original status
BookingSchema.pre("init", function (doc) {
    this._originalStatus = doc.status;
});

// Restrict edits if booking is final
BookingSchema.pre("save", function (next, options) {
    const isFinal = [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED].includes(this.status);
    if (!this.isNew && isFinal && this.isModified() && !options?.allowEdit) {
        if (
            this._originalStatus &&
            [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED].includes(this._originalStatus)
        ) {
            return next(
                new Error(
                    "Completed or cancelled bookings cannot be edited unless explicitly allowed."
                )
            );
        }
    }
    next();
});

// Indexes
BookingSchema.index({ status: 1, createdAt: -1 });
BookingSchema.index({ status: 1, scheduledDate: -1 });
BookingSchema.index({ status: 1, arrivedAt: -1 });
BookingSchema.index({ status: 1, cancelledAt: -1 });
BookingSchema.index({ status: 1, completedAt: -1 });
BookingSchema.index({ services: 1 });
BookingSchema.index({
    vehicleRegNo: "text",
    makeModel: "text",
    ownerName: "text",
    ownerAddress: "text",
    ownerPostalCode: "text",
    ownerEmail: "text",
    ownerNumber: "text",
    remarks: "text",
});

// Virtuals
BookingSchema.virtual("createdDate").get(function () {
    return this.createdAt;
});
BookingSchema.virtual("registration").get(function () {
    return this.vehicleRegNo;
});
BookingSchema.virtual("phoneNumber").get(function () {
    return this.ownerNumber;
});
BookingSchema.virtual("postCode").get(function () {
    return this.ownerPostalCode;
});

export default mongoose.model("Booking", BookingSchema);
