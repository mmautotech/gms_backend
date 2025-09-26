import mongoose from "mongoose";

const PurchaseItemSchema = new mongoose.Schema(
    {
        partName: { type: String, required: true, trim: true },
        partNumber: { type: String, trim: true },
        rate: { type: Number, required: true, min: 0, set: (v) => Number(v.toFixed(2)) },
        quantity: { type: Number, required: true, min: 1 },
    },
    { _id: false }
);

const PurchaseInvoiceSchema = new mongoose.Schema(
    {
        purchaser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
        booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: false, index: true },
        vehicleRegNo: { type: String, trim: true, required: true },
        items: { type: [PurchaseItemSchema], required: true },
        invoiceDate: { type: Date, default: Date.now },
        paymentDate: { type: Date, required: true },
        discount: { type: Number, default: 0, min: 0, set: (v) => Number(v.toFixed(2)) },
        vatIncluded: { type: Boolean, default: false },
        vendorInvoiceNumber: { type: String, trim: true },
        vendorInvoicePhoto: { type: String, default: null },
        paymentStatus: { type: String, enum: ["Paid", "Partial", "Pending"], default: "Paid" },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Virtual total calculation
PurchaseInvoiceSchema.virtual("totalAmount").get(function () {
    const subtotal = this.items.reduce((sum, item) => sum + item.rate * item.quantity, 0);
    const discounted = subtotal - this.discount;
    return this.vatIncluded ? discounted * 1.2 : discounted;
});

PurchaseInvoiceSchema.set("toJSON", { virtuals: true });
PurchaseInvoiceSchema.set("toObject", { virtuals: true });

const PurchaseInvoice = mongoose.model("PurchaseInvoice", PurchaseInvoiceSchema);
export default PurchaseInvoice;