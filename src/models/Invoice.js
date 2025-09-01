import mongoose from 'mongoose';  // Use 'import' instead of 'require'

const invoiceItemSchema = new mongoose.Schema({
    description: { type: String, required: true },
    qty: { type: Number, required: true },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true }
});

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    invoiceDate: { type: Date, default: Date.now },
    items: [invoiceItemSchema], // Array of invoice items
    totalAmount: { type: Number, required: true },
    advanceAmount: { type: Number, default: 0 },
    netReceivableAmount: { type: Number, required: true },
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

// Export using default export
export default Invoice;
