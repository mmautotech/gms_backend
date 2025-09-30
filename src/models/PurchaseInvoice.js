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
            set: (v) => Number(v.toFixed(2)), // enforce 2 decimals
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

        // Booking (now one-to-many: a booking can have multiple invoices)
        booking: { type: ObjectId, ref: "Booking", required: true, index: true },

        // Active flag
        isActive: { type: Boolean, default: true },

        // Purchased items
        items: { type: [PurchaseItemSchema], required: true },

        // Payment due date
        paymentDate: { type: Date, required: true },

        // Payment status
        paymentStatus: {
            type: String,
            enum: ["Paid", "Partial", "Unpaid"],
            required: true,
        },

        // Discount (default 0)
        discount: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
            set: (v) => Number(v.toFixed(2)),
        },

        // VAT included (true → apply 20% VAT)
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
    // Always apply VAT multiplier if vatIncluded = true
    return this.vatIncluded ? discounted * 1.2 : discounted;
});

// --- JSON options ---
PurchaseInvoiceSchema.set("toJSON", { virtuals: true });
PurchaseInvoiceSchema.set("toObject", { virtuals: true });

// ❌ Removed unique index: allow multiple invoices per booking
// PurchaseInvoiceSchema.index(
//     { booking: 1, isActive: 1 },
//     { unique: true, partialFilterExpression: { isActive: true } }
// );

const PurchaseInvoice = mongoose.model("PurchaseInvoice", PurchaseInvoiceSchema);
export default PurchaseInvoice;
