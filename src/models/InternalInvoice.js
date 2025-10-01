// src/models/InternalInvoice.js
import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const InternalInvoiceSchema = new mongoose.Schema(
    {
        booking: { type: ObjectId, ref: "Booking", required: true },
        invoice: { type: ObjectId, ref: "Invoice", required: true },
        purchaseInvoice: { type: ObjectId, ref: "PurchaseInvoice", required: true },
        revenue: { type: Number, default: 0 },
        cost: { type: Number, default: 0 },
        profit: { type: Number, default: 0 },
        createdBy: { type: ObjectId, ref: "User" },
    },
    { timestamps: true }
);

export default mongoose.model("InternalInvoice", InternalInvoiceSchema);
