import mongoose from "mongoose";

const PurchaseItemSchema = new mongoose.Schema(
    {
        part: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Part",
            required: true,
        },
        rate: {
            type: Number,
            required: true,
            min: [0, "Rate cannot be negative"],
            set: (v) => Number(v.toFixed(2)),
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, "Quantity must be at least 1"],
        },
    },
    { _id: false }
);

const PurchaseInvoiceSchema = new mongoose.Schema(
    {
        purchaser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        supplier: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Supplier",
            required: true,
            index: true,
        },
        items: {
            type: [PurchaseItemSchema],
            validate: {
                validator: (val) => {
                    const parts = val.map((i) => i.part.toString());
                    return parts.length === new Set(parts).size;
                },
                message: "Each part must be unique within an invoice",
            },
        },
        invoiceDate: {
            type: Date,
            default: Date.now, // explicitly store invoice creation date
            index: true,
        },
        paymentDate: {
            type: Date,
            required: true,
        },
        discount: {
            type: Number,
            default: 0,
            min: [0, "Discount cannot be negative"],
            set: (v) => Number(v.toFixed(2)),
        },
        vatIncluded: {
            type: Boolean,
            default: false,
        },
        vendorInvoiceNumber: {
            type: String,
            trim: true,
        },
        vendorInvoicePhoto: {
            type: String, // file path or URL
            default: null,
        },
        paymentStatus: {
            type: String,
            enum: ["Paid", "Partial", "Pending"],
            default: "Pending",
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

// 🔹 Unique vendor invoice per supplier
PurchaseInvoiceSchema.index({ supplier: 1, vendorInvoiceNumber: 1 }, { unique: true, sparse: true });

// 🔹 Virtual total calculation
PurchaseInvoiceSchema.virtual("totalAmount").get(function () {
    const subtotal = this.items.reduce((sum, item) => sum + item.rate * item.quantity, 0);
    const discounted = subtotal - this.discount;
    return this.vatIncluded ? discounted * 1.2 : discounted; // assuming VAT = 20%
});

const PurchaseInvoice = mongoose.model("PurchaseInvoice", PurchaseInvoiceSchema);
export default PurchaseInvoice;
