// models/Invoice.js
import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  qty: { type: Number, required: true },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true },
});

const invoiceSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true }, // ✅ link to booking
  invoiceNumber: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  contactNumber: { type: String },
  vehicleRegNo: { type: String },
  makeModel: { type: String },
  invoiceDate: { type: Date, default: Date.now },
  items: [invoiceItemSchema],
  totalAmount: { type: Number, required: true },
  advanceAmount: { type: Number, default: 0 },
  netReceivableAmount: { type: Number, required: true },
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
