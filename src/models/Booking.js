// src/models/Booking.js
import mongoose from 'mongoose';

export const BOOKING_STATUS = {
    PENDING: 'pending',        // Pre-booked (default)
    CONFIRMED: 'confirmed',    // Optional step before arrival
    ARRIVED: 'arrived',        // Vehicle checked-in to garage
    COMPLETE: 'complete',      // Vehicle out of garage
    CANCELLED: 'cancelled'     // Cancelled any time before complete
};

const moneyOpts = { type: Number, min: 0, default: 0 };

const BookingSchema = new mongoose.Schema(
    {
        // auto: the date the pre-booking is created (current date)
        preBookingDate: { type: Date, default: Date.now, immutable: true, index: true },

        // Business fields
        carRegNo: { type: String, required: true, trim: true, index: true },
        makeModel: { type: String, required: true, trim: true },
        clientName: { type: String, required: true, trim: true },
        clientAddress: { type: String, trim: true, default: '' },
        phoneNumber: { type: String, trim: true, default: '' },

        // ✅ Replaced remarks with services array
      services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],

        // Scheduled arrival (entered at pre-booking time)
        scheduledArrivalDate: { type: Date, required: true },

        // Costs
        bookingPrice: moneyOpts, // e.g., diagnostic/booking charges
        labourCost: moneyOpts,
        partsCost: moneyOpts,

        // Status
        status: {
            type: String,
            enum: Object.values(BOOKING_STATUS),
            default: BOOKING_STATUS.PENDING,
            index: true
        },

        // Status timestamps (auto managed in routes)
        confirmedAt: { type: Date },
        arrivedAt: { type: Date },
        completedAt: { type: Date },
        cancelledAt: { type: Date },

        // Audit
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    { timestamps: true }
);

// Handy virtual for totals
BookingSchema.virtual('totalCost').get(function () {
    return (this.bookingPrice || 0) + (this.labourCost || 0) + (this.partsCost || 0);
});

// Optional: prevent edits after completion/cancellation at DB level
BookingSchema.pre('save', function (next) {
    if (!this.isNew && (this.status === BOOKING_STATUS.COMPLETE || this.status === BOOKING_STATUS.CANCELLED)) {
        // Allow saving only if we're not changing business fields
        const changed = this.modifiedPaths();
        const forbidden = [
            'carRegNo', 'makeModel', 'clientName', 'clientAddress', 'phoneNumber',
            'services', 'scheduledArrivalDate', 'bookingPrice', 'labourCost', 'partsCost'
        ];
        const touchesForbidden = changed.some(p => forbidden.includes(p));
        if (touchesForbidden) {
            return next(new Error('Completed or cancelled bookings cannot be edited.'));
        }
    }
    next();
});

export default mongoose.model('Booking', BookingSchema);
