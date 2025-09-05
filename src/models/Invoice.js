// models/Invoice.js
import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
  description: { type: String },
  qty: { type: Number, required: true, min: 1 },
  rate: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 }, // qty * rate
  discount: { type: Number, default: 0, min: 0 },
  amount: { type: Number, required: true, min: 0 }, // price - discount
});

const invoiceSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true, // ✅ one invoice per booking
    },

    invoiceNumber: { type: String, unique: true }, // ✅ will auto-generate
    invoiceDate: { type: Date, default: Date.now },

    items: [invoiceItemSchema],

    totalAmount: { type: Number, required: true }, // sum of item.price
    totalDiscount: { type: Number, default: 0 }, // sum of discounts
    subTotal: { type: Number, required: true }, // totalAmount - totalDiscount

    vatRate: { type: Number, default: 0 }, // % (e.g. 20)
    vatAmount: { type: Number, default: 0 }, // calculated

    netReceivableAmount: { type: Number, required: true }, // subTotal + vatAmount
    advanceAmount: { type: Number, default: 0 },
    amountReceived: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// --- Auto-generate Invoice Number ---
invoiceSchema.pre("validate", async function (next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model("Invoice").countDocuments();
    this.invoiceNumber = `INV-${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

// --- Auto-calculate VAT + totals ---
invoiceSchema.pre("save", function (next) {
  this.totalAmount = this.items.reduce((sum, item) => sum + item.price, 0);
  this.totalDiscount = this.items.reduce((sum, item) => sum + item.discount, 0);
  this.subTotal = this.totalAmount - this.totalDiscount;

  this.vatAmount = (this.subTotal * this.vatRate) / 100;
  this.netReceivableAmount = this.subTotal + this.vatAmount;

  this.balance = this.netReceivableAmount - (this.advanceAmount + this.amountReceived);

  next();
});

const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;
