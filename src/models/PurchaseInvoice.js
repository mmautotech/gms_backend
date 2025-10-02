// src/models/PurchaseInvoice.js
import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

// --- Purchase Item Schema ---
const PurchaseItemSchema = new mongoose.Schema(
    {
        part: {
            type: ObjectId,
            ref: "Part",
            required: true,
        },
        rate: {
            type: Number,
            required: true,
            min: 0,
            // store with 2 decimals consistently
            set: (v) => (v != null ? Number(v.toFixed(2)) : v),
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
    },
    { _id: false }
);

// --- Purchase Invoice Schema ---
const PurchaseInvoiceSchema = new mongoose.Schema(
    {
        // User who created the invoice
        purchaser: { type: ObjectId, ref: "User", required: true },

        // Supplier (linked to Supplier model)
        supplier: { type: ObjectId, ref: "Supplier", required: true },

        // Booking (locked to one booking per invoice, cannot be changed after creation)
        booking: { type: ObjectId, ref: "Booking", required: true, index: true },

        // Active flag
        isActive: { type: Boolean, default: true },

        // Purchased items
        items: { type: [PurchaseItemSchema], required: true },

        // Payment due date
        paymentDate: { type: Date, required: true },

        // Payment status (default: Unpaid)
        paymentStatus: {
            type: String,
            enum: ["Paid", "Partial", "Unpaid"],
            required: true,
            default: "Unpaid",
        },

        // Discount (default 0, enforce 2 decimals)
        discount: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
            set: (v) => (v != null ? Number(v.toFixed(2)) : v),
        },

        // VAT included (true → apply 20% VAT multiplier)
        vatIncluded: { type: Boolean, default: true },

        // Vendor invoice reference
        vendorInvoiceNumber: { type: String, required: true, trim: true },

        // Vendor invoice photo (optional)
        vendorInvoicePhoto: { type: String, default: null },
    },
    { timestamps: true }
);

// --- Virtual: total amount ---
PurchaseInvoiceSchema.virtual("totalAmount").get(function () {
    const subtotal = this.items.reduce(
        (sum, item) => sum + item.rate * item.quantity,
        0
    );
    const discounted = subtotal - this.discount;
    return this.vatIncluded ? discounted * 1.2 : discounted;
});

// --- JSON options ---
PurchaseInvoiceSchema.set("toJSON", { virtuals: true });
PurchaseInvoiceSchema.set("toObject", { virtuals: true });

const PurchaseInvoice = mongoose.model("PurchaseInvoice", PurchaseInvoiceSchema);
export default PurchaseInvoice;
