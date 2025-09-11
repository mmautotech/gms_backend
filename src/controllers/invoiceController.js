import Invoice from "../models/Invoice.js";
import Booking from "../models/Booking.js";

// ✅ Safe Auto invoice number generator
const generateInvoiceNo = async () => {
  const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
  if (!lastInvoice || !lastInvoice.invoiceNo) return "INV-0001";

  let lastNo = 0;
  if (lastInvoice.invoiceNo.includes("-")) {
    const parts = lastInvoice.invoiceNo.split("-");
    lastNo = parseInt(parts[1], 10) || 0;
  } else {
    lastNo = parseInt(lastInvoice.invoiceNo, 10) || 0;
  }

  const nextNo = (lastNo + 1).toString().padStart(4, "0");
  return `INV-${nextNo}`;
};

// -----------------------------
// 🧾 Get or Create Invoice by Booking ID
// -----------------------------
export const getInvoice = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { createdBy, discountAmount = 0, vatIncluded = false, status = "Unpaid" } = req.body || {};

    if (!bookingId) return res.status(400).json({ message: "Booking ID is required" });

    // 1️⃣ Try to find existing invoice
    let invoice = await Invoice.findOne({ booking: bookingId }).lean();
    if (invoice) return res.status(200).json(invoice);

    // 2️⃣ Fetch booking
    const booking = await Booking.findById(bookingId)
      .populate("prebookingServices", "name")
      .populate("upsells.services", "name")
      .lean();

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // 3️⃣ Generate invoice number
    const invoiceNo = await generateInvoiceNo();

    // 4️⃣ Prepare items
    const items = [];

    // Prebooking services
    if (booking.prebookingServices?.length) {
      booking.prebookingServices.forEach(service => {
        items.push({
          description: service.name,
          amount: booking.prebookingBookingPrice || 0,
        });
      });
    }

    // Upsell services
    if (booking.upsells?.length) {
      booking.upsells.forEach((upsell) => {
        upsell.services?.forEach(service => {
          items.push({
            description: `Upsell - ${service.name}`,
            amount: upsell.upsellPrice || 0,
          });
        });
      });
    }

    // 5️⃣ Calculate total with discount & VAT
    const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
    const afterDiscount = subtotal - discountAmount;
    const finalTotal = vatIncluded ? afterDiscount * 1.2 : afterDiscount; // assuming VAT = 15%

    // 6️⃣ Create new invoice
    invoice = await Invoice.create({
      booking: booking._id,
      invoiceNo,
      customerName: booking.ownerName,
      contactNo: booking.ownerNumber,
      email: booking.ownerEmail,
      vehicleRegNo: booking.vehicleRegNo,
      makeModel: booking.makeModel,
      invoiceDate: new Date(),
      items,
      discountAmount,
      vatIncluded,
      status,
      totalAmount: finalTotal,
      createdBy: createdBy || booking.createdBy,
    });

    res.status(201).json(invoice);
  } catch (err) {
    console.error("Get/Create invoice error:", err);
    res.status(500).json({ message: "Failed to get or create invoice", error: err.message });
  }
};

// -----------------------------
// 🧾 Get All Invoices
// -----------------------------
export const getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 }).lean();
    res.status(200).json(invoices);
  } catch (err) {
    console.error("Error fetching all invoices:", err);
    res.status(500).json({ message: "Failed to get invoices", error: err.message });
  }
};

// -----------------------------
// 🧾 Update Invoice
// -----------------------------
export const updateInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { items, discountAmount = 0, vatIncluded = false, status } = req.body || {};

    if (!invoiceId) return res.status(400).json({ message: "Invoice ID is required" });

    // 1️⃣ Fetch invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    // 2️⃣ Fetch linked booking to refresh customer/vehicle info
    const booking = await Booking.findById(invoice.booking).lean();
    if (!booking) return res.status(404).json({ message: "Linked booking not found" });

    // 3️⃣ Refresh fields from booking (sync snapshot fields)
    invoice.customerName = booking.ownerName;
    invoice.contactNo = booking.ownerNumber;
    invoice.vehicleRegNo = booking.vehicleRegNo;
    invoice.makeModel = booking.makeModel;

    // 4️⃣ Update editable fields
    if (Array.isArray(items)) {
      invoice.items = items.map(item => ({
        description: item.description,
        amount: item.amount,
      }));
    }

    invoice.discountAmount = discountAmount;
    invoice.vatIncluded = vatIncluded;
    if (status) invoice.status = status;

    // 5️⃣ Recalculate total
    const subtotal = invoice.items.reduce((sum, i) => sum + i.amount, 0);
    const afterDiscount = subtotal - invoice.discountAmount;
    invoice.totalAmount = invoice.vatIncluded ? afterDiscount * 1.15 : afterDiscount;

    // 🔒 Do NOT update: invoiceNo, booking, invoiceDate

    await invoice.save();

    res.status(200).json(invoice);
  } catch (err) {
    console.error("Error updating invoice:", err);
    res.status(500).json({ message: "Failed to update invoice", error: err.message });
  }
};
