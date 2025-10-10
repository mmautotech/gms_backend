// models/Invoice.js
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

    // 🔹 Landing date snapshot (from Booking.arrivedAt)
    landingDate: { type: Date, default: null },

    // 🔹 Line items (services, upsells, parts, etc.)
    items: { type: [invoiceItemSchema], default: [] },

    // 🔹 Totals
    totalAmount: { ...moneyOpts, required: true },

    // 🔹 Financial modifiers
    discountAmount: { type: Number, min: 0, default: 0 },
    vatIncluded: { type: Boolean, default: false },

    // 🔹 Payment status (customer-oriented)
    status: {
      type: String,
      enum: ["Received", "Receivable", "Partial"],
      default: "Receivable",
      index: true,
    },

    // 🔹 User who created the invoice
    createdBy: { type: ObjectId, ref: "User" },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
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
InvoiceSchema.index({ landingDate: -1 });
InvoiceSchema.index({ customerName: "text", invoiceNo: "text" });

// --- Pre-save hook to auto-map landingDate from Booking ---
InvoiceSchema.pre("save", async function (next) {
  if (this.isNew && this.booking && !this.landingDate) {
    try {
      const Booking = mongoose.model("Booking");
      const bookingDoc = await Booking.findById(this.booking)
        .select("arrivedAt scheduledDate createdAt")
        .lean();
      if (bookingDoc) {
        this.landingDate =
          bookingDoc.arrivedAt ||
          bookingDoc.scheduledDate ||
          bookingDoc.createdAt;
      }
    } catch (err) {
      console.warn("⚠️ Could not map landingDate from Booking:", err.message);
    }
  }
  next();
});

const Invoice = mongoose.model("Invoice", InvoiceSchema);
export default Invoice;
