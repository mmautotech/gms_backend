// src/models/InternalInvoice.js
import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

// --- Internal Invoice Item Schema ---
const internalInvoiceItemSchema = new mongoose.Schema(
    {
        description: { type: String, required: true }, // Service or Part name
        invoiceType: {
            type: String,
            enum: ["service", "part"],
            required: true,
        }, // type of item

        // Parts-specific fields
        partId: { type: ObjectId, ref: "Part" },
        vendorInvoiceNumber: { type: String }, // for parts purchase
        partsPurchaseRef: { type: ObjectId, ref: "PurchaseInvoice" },

        // Service-specific field
        invoiceRef: { type: ObjectId, ref: "Invoice" }, // reference to customer invoice if service

        // Financials
        quantity: { type: Number, default: 1 },
        costPrice: { type: Number, default: 0 }, // internal cost
        sellingPrice: { type: Number, default: 0 }, // what we charge customer
        totalPrice: { type: Number, default: 0 }, // auto-calculated
        paymentStatus: {
            type: String,
            enum: ["Pending", "Paid"],
            default: "Paid",
        },
        vatIncluded: { type: Boolean, default: false }, // per item VAT
    },
    { _id: false }
);

// --- Internal Invoice Schema ---
const internalInvoiceSchema = new mongoose.Schema(
    {
        vehicleRegNo: { type: String, required: true },
        booking: { type: ObjectId, ref: "Booking" },

        items: { type: [internalInvoiceItemSchema], default: [] },

        // Totals (auto-calculated)
        totalCost: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        profit: { type: Number, default: 0 },

        // VAT fields (new)
        vatIncluded: { type: Boolean, default: false }, // true if any item has VAT
        vatTotal: { type: Number, default: 0 }, // total VAT amount

        invoiceDate: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true },

        // Links for reference
        customerInvoice: { type: ObjectId, ref: "Invoice" },
        partsPurchaseInvoices: [{ type: ObjectId, ref: "PurchaseInvoice" }],
    },
    { timestamps: true }
);

// --- Auto-calculation of totals including VAT ---
internalInvoiceSchema.pre("save", function (next) {
    if (this.items?.length) {
        let cost = 0;
        let revenue = 0;
        let vatTotal = 0;
        const VAT_RATE = 0.2; // 20% VAT, adjust if needed

        this.items.forEach((item) => {
            item.totalPrice = (item.sellingPrice || 0) * (item.quantity || 1);

            cost += (item.costPrice || 0) * (item.quantity || 1);
            revenue += item.totalPrice;

            if (item.vatIncluded) {
                vatTotal += item.totalPrice * VAT_RATE;
            }
        });

        this.totalCost = cost;
        this.totalRevenue = revenue;
        this.profit = revenue - cost;
        this.vatTotal = vatTotal;
        this.vatIncluded = vatTotal > 0;
    }
    next();
});

const InternalInvoice = mongoose.model("InternalInvoice", internalInvoiceSchema);
export default InternalInvoice;