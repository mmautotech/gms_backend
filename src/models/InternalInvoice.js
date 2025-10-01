// src/models/InternalInvoice.js
import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const InternalInvoiceSchema = new mongoose.Schema(
    {
        booking: { type: ObjectId, ref: "Booking", required: true },   // Link to booking
        invoice: { type: ObjectId, ref: "Invoice", required: true },   // Customer invoice

        // ✅ Allow multiple purchase invoices
        purchaseInvoices: [
            { type: ObjectId, ref: "PurchaseInvoice" }
        ],

        // Financial fields
        revenue: { type: Number, default: 0 },
        cost: { type: Number, default: 0 },
        profit: { type: Number, default: 0 },

        // User who created the invoice
        createdBy: { type: ObjectId, ref: "User" },
    },
    { timestamps: true }
);

export default mongoose.model("InternalInvoice", InternalInvoiceSchema);
