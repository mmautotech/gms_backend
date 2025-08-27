// models/Upsell.js
import mongoose from "mongoose";

const UpsellSchema = new mongoose.Schema(
    {
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            required: true,
        },
        partId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Part",
            required: true, // must always point to a valid part
        },
        partPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        labourPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        supplierId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Supplier",
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Upsell", UpsellSchema);
