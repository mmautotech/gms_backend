import Invoice from "../models/Invoice.js";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";

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
// 🧾 Create or Update Invoice from Booking
// -----------------------------
export const createInvoice = async (req, res) => {
  try {
    const { bookingId, createdBy, clientName, phone, email, services } = req.body;

    // 1️⃣ Fetch booking
    const booking = await Booking.findById(bookingId)
      .populate("services", "name")
      .populate("upsells.services", "name")
      .lean();

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // 2️⃣ Generate invoice number
    const invoiceNo = await generateInvoiceNo();

    // 3️⃣ Build items
    let items = [];
    if (services && services.length) {
      // Use updated services from frontend
      items = services.map((s) => ({
        description: s.name,
        amount: s.rate || 0,
      }));
    } else if (booking.services?.length) {
      // Fallback to booking services
      items.push(
        ...booking.services.map((s) => ({
          description: s.name,
          amount: booking.bookingPrice || 0,
        }))
      );
    }

    if (booking.upsells?.length) {
      booking.upsells.forEach((u) => {
        u.services?.forEach((s) => {
          items.push({
            description: `Upsell - ${s.name}`,
            amount: u.upsellPrice || 0,
          });
        });
      });
    }

    // 4️⃣ Calculate total
    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

    // 5️⃣ Check if invoice already exists
    let invoice = await Invoice.findOne({ booking: bookingId });
    if (invoice) {
      // Update existing invoice
      invoice.invoiceNo = invoiceNo; // optionally keep the same invoice number
      invoice.customerName = clientName || booking.ownerName;
      invoice.contactNo = phone || booking.ownerNumber;
      invoice.email = email || booking.ownerEmail || "";
      invoice.items = items;
      invoice.totalAmount = totalAmount;
      invoice.makeModel = booking.makeModel;
      invoice.vehicleRegNo = booking.vehicleRegNo;
      invoice.createdBy = createdBy || booking.createdBy;
      await invoice.save();
    } else {
      // Create new invoice
      invoice = await Invoice.create({
        booking: booking._id,
        invoiceNo,
        customerName: clientName || booking.ownerName,
        contactNo: phone || booking.ownerNumber,
        email: email || booking.ownerEmail || "",
        invoiceDate: new Date(),
        makeModel: booking.makeModel,
        vehicleRegNo: booking.vehicleRegNo,
        items,
        totalAmount,
        createdBy: createdBy || booking.createdBy,
      });
    }

    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ message: "Error creating/updating invoice", error: err.message });
  }
};

export const getInvoice = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) return res.status(400).json({ message: "Booking ID is required" });

    const invoice = await Invoice.findOne({ booking: bookingId }).lean();
    if (!invoice) return res.status(404).json({ message: "Invoice not found for this booking" });

    res.status(200).json(invoice);
  } catch (err) {
    console.error("Get invoice error:", err);
    res.status(500).json({ message: "Error fetching invoice", error: err.message });
  }
};
