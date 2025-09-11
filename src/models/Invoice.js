// models/Invoice.js
import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const moneyOpts = { type: Number, min: 0, default: 0 };

// --- Invoice Item Schema ---
const invoiceItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    amount: { ...moneyOpts, required: true },
  },
  { _id: false }
);

// --- Invoice Schema ---
const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, required: true, unique: true }, // e.g. "INV-20250910-001"
    booking: { type: ObjectId, ref: "Booking", required: true },

    // Customer snapshot (denormalized from Booking)
    customerName: { type: String, required: true },
    contactNo: { type: String, required: true },
    postalCode: { type: String, required: true },
    vehicleRegNo: { type: String, required: true },
    makeModel: { type: String, required: true },

    invoiceDate: { type: Date, default: Date.now },

    // Line items (services, upsells, parts, etc.)
    items: { type: [invoiceItemSchema], default: [] },

    // Totals
    totalAmount: { ...moneyOpts, required: true },

    // ✅ New fields
    discountAmount: { type: Number, min: 0, default: 0 },
    vatIncluded: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Unpaid", "Partial", "Paid"],
      default: "Unpaid",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // optional now
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
    toObject: { virtuals: true, versionKey: false },
  }
);

const Invoice = mongoose.model("Invoice", InvoiceSchema);
export default Invoice;
