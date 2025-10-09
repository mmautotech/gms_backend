import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

// Common numeric options
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
    // 🔹 Unique invoice number for human readability
    invoiceNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    // 🔹 Booking reference
    booking: { type: ObjectId, ref: "Booking", required: true, index: true },

    // 🔹 Customer snapshot (denormalized for reporting)
    customerName: { type: String, required: true, trim: true },
    contactNo: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    vehicleRegNo: { type: String, required: true, trim: true, uppercase: true },
    makeModel: { type: String, required: true, trim: true },

    // 🔹 Invoice issue date
    invoiceDate: { type: Date, default: Date.now },

    // 🔹 Line items (services, upsells, parts, etc.)
    items: { type: [invoiceItemSchema], default: [] },

    // 🔹 Totals
    totalAmount: { ...moneyOpts, required: true },

    // 🔹 Financial modifiers
    discountAmount: { type: Number, min: 0, default: 0 },
    vatIncluded: { type: Boolean, default: false },

    // 🔹 Payment status
    status: {
      type: String,
      enum: ["Unpaid", "Partial", "Paid"],
      default: "Unpaid",
    },

    // 🔹 User who created the invoice
    createdBy: { type: ObjectId, ref: "User" },

    // 🔹 Optional notes
    notes: { type: String, trim: true, default: "" },
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

// --- Indexes for performance ---
InvoiceSchema.index({ invoiceNo: 1 });
InvoiceSchema.index({ booking: 1 });
InvoiceSchema.index({ customerName: "text", invoiceNo: "text" });

const Invoice = mongoose.model("Invoice", InvoiceSchema);
export default Invoice;
