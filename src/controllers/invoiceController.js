// controllers/invoiceController.js
import Invoice from "../models/Invoice.js";
import Booking from "../models/Booking.js";

// --- Helper: Calculate totals for invoice ---
const calculateTotals = ({ items = [], vatRate = 0, advanceAmount = 0, amountReceived = 0 }) => {
  const subTotal = items.reduce((acc, item) => acc + (item.amount || 0), 0);
  const vatAmount = (subTotal * vatRate) / 100;
  const totalAmount = subTotal + vatAmount;
  const netReceivableAmount = totalAmount - advanceAmount - amountReceived;
  const balance = netReceivableAmount;
  return { subTotal, vatAmount, totalAmount, netReceivableAmount, balance };
};

// --- CREATE Invoice ---
export const createInvoice = async (req, res) => {
  try {
    const { bookingId, items, advanceAmount = 0, vatRate = 0, amountReceived = 0 } = req.body;

    // Check booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Check if invoice already exists for this booking
    const existingInvoice = await Invoice.findOne({ bookingId });
    if (existingInvoice) {
      return res.status(400).json({ message: "Invoice already exists for this booking" });
    }

    // Calculate price & amount for each item
    const processedItems = items.map(item => {
      const price = (item.qty || 0) * (item.rate || 0);
      const amount = price - (item.discount || 0);
      return { ...item, price, amount };
    });

    // Calculate totals
    const { subTotal, vatAmount, totalAmount, netReceivableAmount, balance } = calculateTotals({
      items: processedItems,
      vatRate,
      advanceAmount,
      amountReceived,
    });

    // Generate invoiceNumber
    const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
    let newInvoiceNumber = "INV-00001";
    if (lastInvoice?.invoiceNumber) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split("-")[1]);
      const nextNumber = (lastNumber + 1).toString().padStart(5, "0");
      newInvoiceNumber = `INV-${nextNumber}`;
    }

    // Create invoice
    const invoice = new Invoice({
      bookingId,
      invoiceNumber: newInvoiceNumber,
      items: processedItems,
      subTotal,
      vatRate,
      vatAmount,
      totalAmount,
      advanceAmount,
      amountReceived,
      netReceivableAmount,
      balance,
      createdBy: req.user?._id,
    });

    await invoice.save();

    res.status(201).json({
      message: "Invoice created successfully",
      invoice,
    });
  } catch (error) {
    console.error("❌ Error creating invoice:", error);
    res.status(500).json({ message: "Error creating invoice", error: error.message });
  }
};

// --- GET Single Invoice by invoiceNumber or MongoId ---
export const getInvoice = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;

    let invoice;
    const bookingFields = "vehicleRegNo makeModel ownerName ownerAddress ownerNumber createdAt updatedAt completedAt";

    if (invoiceNumber.startsWith("INV-")) {
      invoice = await Invoice.findOne({ invoiceNumber }).populate({
        path: "bookingId",
        select: bookingFields,
      });
    } else {
      invoice = await Invoice.findById(invoiceNumber).populate({
        path: "bookingId",
        select: bookingFields,
      });
    }

    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    res.status(200).json(invoice);
  } catch (error) {
    console.error("❌ Error fetching invoice:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// --- GET All Invoices (optional filter by bookingId) ---
export const getInvoices = async (req, res) => {
  try {
    const { bookingId } = req.query;
    const filter = {};
    if (bookingId) filter.bookingId = bookingId;

    const bookingFields = "vehicleRegNo makeModel ownerName ownerAddress ownerNumber createdAt updatedAt completedAt";

    const invoices = await Invoice.find(filter).populate({
      path: "bookingId",
      select: bookingFields,
    });

    res.status(200).json(invoices);
  } catch (error) {
    console.error("❌ Error fetching invoices:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// --- UPDATE Invoice ---
export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, vatRate, advanceAmount, amountReceived } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    // Update items
    if (items) {
      invoice.items = items.map(item => {
        const price = (item.qty || 0) * (item.rate || 0);
        const amount = price - (item.discount || 0);
        return { ...item, price, amount };
      });
    }

    if (vatRate !== undefined) invoice.vatRate = vatRate;
    if (advanceAmount !== undefined) invoice.advanceAmount = advanceAmount;
    if (amountReceived !== undefined) invoice.amountReceived = amountReceived;

    // Recalculate totals
    const { subTotal, vatAmount, totalAmount, netReceivableAmount, balance } = calculateTotals({
      items: invoice.items,
      vatRate: invoice.vatRate,
      advanceAmount: invoice.advanceAmount,
      amountReceived: invoice.amountReceived,
    });

    invoice.subTotal = subTotal;
    invoice.vatAmount = vatAmount;
    invoice.totalAmount = totalAmount;
    invoice.netReceivableAmount = netReceivableAmount;
    invoice.balance = balance;

    invoice.updatedBy = req.user?._id;

    await invoice.save();

    res.status(200).json(invoice);
  } catch (error) {
    console.error("❌ Error updating invoice:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
