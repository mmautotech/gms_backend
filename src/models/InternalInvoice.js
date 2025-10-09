import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const InternalInvoiceSchema = new mongoose.Schema(
    {
        // -----------------------------
        // 🔗 Primary & Related References
        // -----------------------------

        // Use the same _id as the linked Invoice
        _id: {
            type: ObjectId,
            ref: "Invoice",
            required: true,
        },

        booking: {
            type: ObjectId,
            ref: "Booking",
            required: true,
            index: true,
        },

        // Redundant field kept for readability (can remove if you always use _id)
        invoice: {
            type: ObjectId,
            ref: "Invoice",
            required: true,
            index: true,
        },

        purchaseInvoices: [
            {
                type: ObjectId,
                ref: "PurchaseInvoice",
            },
        ],

        // -----------------------------
        // 💰 Financial Metrics
        // -----------------------------
        sales: { type: Number, default: 0, min: 0 },
        purchases: { type: Number, default: 0, min: 0 },
        netVat: { type: Number, default: 0 },
        profit: { type: Number, default: 0 },

        // -----------------------------
        // 🧾 Metadata
        // -----------------------------
        notes: { type: String, trim: true, maxlength: 500 },

        // -----------------------------
        // 👤 Audit Trail
        // -----------------------------
        createdBy: { type: ObjectId, ref: "User" },
        updatedBy: { type: ObjectId, ref: "User" },
    },
    {
        _id: false, // 🚀 Prevents Mongoose from creating its own ObjectId
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// -----------------------------
// 🧮 Virtual Field
// -----------------------------
InternalInvoiceSchema.virtual("calculatedProfit").get(function () {
    return (this.sales || 0) - (this.purchases || 0) - (this.netVat || 0);
});

// -----------------------------
// ⚙️ Pre-save Hook
// -----------------------------
InternalInvoiceSchema.pre("save", function (next) {
    this.profit = (this.sales || 0) - (this.purchases || 0) - (this.netVat || 0);
    next();
});

// -----------------------------
// ⚡ Indexes
// -----------------------------
InternalInvoiceSchema.index({ createdAt: -1 });
InternalInvoiceSchema.index({ booking: 1 });
InternalInvoiceSchema.index({ invoice: 1 });

export default mongoose.model("InternalInvoice", InternalInvoiceSchema);
