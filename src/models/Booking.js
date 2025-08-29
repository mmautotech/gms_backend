import mongoose from "mongoose";

export const BOOKING_STATUS = {
    PENDING: "pending",       // Pre-booked
    ARRIVED: "arrived",       // Vehicle arrived, upsells can be added
    COMPLETED: "completed",   // Service done
    CANCELLED: "cancelled",   // Cancelled before completion
};

const moneyOpts = { type: Number, min: 0, default: 0 };

// --- Upsell Subdocument ---
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

// --- Main Booking Schema ---
const BookingSchema = new mongoose.Schema(
    {
        carRegNo: { type: String, required: true, trim: true, index: true },
        makeModel: { type: String, required: true, trim: true },
        clientName: { type: String, required: true, trim: true },
        clientAddress: { type: String, trim: true, default: "" },
        phoneNumber: { type: String, trim: true, default: "" },

        services: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],

        scheduledDate: { type: Date, required: true },

        // --- Pre-booking / Original values ---
        originalLabourCost: moneyOpts,
        originalPartsCost: moneyOpts,
        originalBookingPrice: moneyOpts,

        // --- Dynamic / recalculated values ---
        labourCost: moneyOpts,
        partsCost: moneyOpts,
        bookingPrice: moneyOpts,

        status: {
            type: String,
            enum: Object.values(BOOKING_STATUS),
            default: BOOKING_STATUS.PENDING,
            index: true,
        },

        arrivedAt: { type: Date },
        arrivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        completedAt: { type: Date },
        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        cancelledAt: { type: Date },
        cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        upsells: [upsellSchema],
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// --- Virtuals ---
BookingSchema.virtual("totalExpense").get(function () {
    return (this.labourCost || 0) + (this.partsCost || 0);
});

BookingSchema.virtual("profit").get(function () {
    return (this.bookingPrice || 0) - this.totalExpense;
});

BookingSchema.virtual("profitPercentage").get(function () {
    if (!this.bookingPrice) return 0;
    return ((this.bookingPrice - this.totalExpense) / this.bookingPrice) * 100;
});

BookingSchema.virtual("totalServices").get(function () {
    let base = this.services?.length || 0;
    let upsellServices = this.upsells?.reduce((acc, u) => acc + (u.services?.length || 0), 0) || 0;
    return base + upsellServices;
});

BookingSchema.virtual("totalParts").get(function () {
    let base = 0; // main booking parts optional
    let upsellParts = this.upsells?.reduce((acc, u) => acc + (u.parts?.length || 0), 0) || 0;
    return base + upsellParts;
});

// --- Pre-save validation: Prevent edits to completed/cancelled ---
BookingSchema.pre("save", function (next) {
    if (!this.isNew && [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED].includes(this.status)) {
        const changed = this.modifiedPaths();
        const forbidden = [
            "carRegNo",
            "makeModel",
            "clientName",
            "clientAddress",
            "phoneNumber",
            "services",
            "scheduledDate",
            "originalBookingPrice",
            "originalLabourCost",
            "originalPartsCost",
            "bookingPrice",
            "labourCost",
            "partsCost",
            "upsells",
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
