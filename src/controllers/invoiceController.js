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
export const getInvoiceByBooking = async (req, res) => {
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
      booking.prebookingServices.forEach((service, index) => {
        items.push({
          description: `Prebooking ${index} - ${service.name}`,
          amount: index === 0 ? booking.prebookingBookingPrice || 0 : 0,
        });
      });
    }

    // Upsell services
    if (booking.upsells?.length) {
      booking.upsells.forEach((upsell, index) => {
        upsell.services?.forEach(service => {
          items.push({
            description: `Upsell ${index} - ${service.name}`,
            amount: upsell.upsellPrice || 0,
          });
        });
      });
    }

    // 5️⃣ Calculate total with discount & VAT
    const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
    const afterDiscount = subtotal - discountAmount;
    const finalTotal = vatIncluded ? afterDiscount * 1.2 : afterDiscount; // assuming VAT = 20%

    // 6️⃣ Create new invoice
    invoice = await Invoice.create({
      booking: booking._id,
      invoiceNo,
      customerName: booking.ownerName,
      contactNo: booking.ownerNumber,
      email: booking.ownerEmail,
      vehicleRegNo: booking.vehicleRegNo,
      makeModel: booking.makeModel,
      postalCode: booking.ownerPostalCode,
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
    invoice.postalCode = booking.ownerPostalCode;

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
    const rawTotal = invoice.vatIncluded ? afterDiscount * 1.2 : afterDiscount;

    // Round up to 2 decimals
    invoice.totalAmount = Math.ceil(rawTotal * 100) / 100;

    // 🔒 Do NOT update: invoiceNo, booking, invoiceDate

    await invoice.save();

    res.status(200).json(invoice);
  } catch (err) {
    console.error("Error updating invoice:", err);
    res.status(500).json({ message: "Failed to update invoice", error: err.message });
  }
};

// -----------------------------
// 🧾 Download Invoice as PDF (with Status + VAT logic)
// -----------------------------
import PDFDocument from "pdfkit";

export const downloadInvoicePdf = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findById(invoiceId).lean();

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // ✅ Setup headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${invoice.invoiceNo || "invoice"}.pdf`
    );

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    // ---------- Header ----------
    doc.font("Helvetica-Bold").fontSize(14).text("PERIVALE MOTOR SERVICES 1", { align: "center" });
    doc.font("Helvetica").fontSize(10).text("67 Bideford Ave, Perivale, Greenford UB6 7PP, United Kingdom", { align: "center" });
    doc.text("Phone: +44 7907 070780", { align: "center" });

    // VAT number (only if vat included)
    if (invoice.vatIncluded) {
      doc.text("VAT No: 488627727", { align: "center" });
    }

    doc.moveDown(1);

    // ---------- Invoice Title ----------
    doc.font("Helvetica-Bold").fontSize(12).text("CUSTOMER INVOICE", { align: "center" });
    doc.moveDown(0.5);

    // ---------- Customer & Vehicle Info Table ----------
    const startX = 40, tableWidth = 520, rowH = 20;
    let y = doc.y + 5;

    const drawCell = (text, x, y, w, h, align = "left", bold = false) => {
      doc.rect(x, y, w, h).stroke();
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10)
        .text(text, x + 4, y + 6, { width: w - 8, align });
    };

    // Row 1
    drawCell("INVOICE #", startX, y, 130, rowH, "left", true);
    drawCell(invoice.invoiceNo || "—", startX + 130, y, 130, rowH);
    drawCell("Invoice Date", startX + 260, y, 130, rowH, "left", true);
    drawCell(
      invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-GB") : "—",
      startX + 390, y, 170, rowH
    );
    y += rowH;

    // Row 2
    drawCell("Customer Name", startX, y, 130, rowH, "left", true);
    drawCell(invoice.customerName || "—", startX + 130, y, 130, rowH);
    drawCell("Postal Code", startX + 260, y, 130, rowH, "left", true);
    drawCell(invoice.postalCode || "—", startX + 390, y, 170, rowH);
    y += rowH;

    // Row 3
    drawCell("Make & Model", startX + 260, y, 130, rowH, "left", true);
    drawCell(invoice.makeModel || "—", startX + 390, y, 170, rowH);
    drawCell("Contact #", startX, y, 130, rowH, "left", true);
    drawCell(invoice.contactNo || "—", startX + 130, y, 130, rowH);
    y += rowH;

    // Row 4 → Payment Status
    // leave other 2 cells empty
    drawCell("Vehicle Reg", startX + 260, y, 130, rowH, "left", true);
    drawCell(invoice.vehicleRegNo || "—", startX + 390, y, 170, rowH);
    drawCell("Status", startX, y, 130, rowH, "left", true);
    drawCell(invoice.status || "Unpaid", startX + 130, y, 130, rowH);
    y += rowH + 10;

    // ---------- Items Table ----------
    drawCell("Description", startX, y, 300, rowH, "left", true);
    drawCell("Qty", startX + 300, y, 100, rowH, "center", true);
    drawCell("Amount", startX + 400, y, 160, rowH, "right", true);
    y += rowH;

    const items = invoice.items || [];
    const MIN_ROWS = 5;
    for (let i = 0; i < Math.max(items.length, MIN_ROWS); i++) {
      const item = items[i] || {};
      drawCell(item.description || "", startX, y, 300, rowH);
      drawCell(item.quantity != null ? String(item.quantity) : "1", startX + 300, y, 100, rowH, "center");
      drawCell(item.amount != null ? `£${Number(item.amount).toFixed(2)}` : "", startX + 400, y, 160, rowH, "right");
      y += rowH;
    }
    y += 10;

    // ---------- Totals ----------
    const subtotal = items.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const discount = Number(invoice.discountAmount || 0);
    const vat = invoice.vatIncluded ? (subtotal - discount) * 0.2 : 0;
    const total = subtotal - discount + vat;

    drawCell("Subtotal", startX + 300, y, 100, rowH, "right", true);
    drawCell(`£${subtotal.toFixed(2)}`, startX + 400, y, 160, rowH, "right");
    y += rowH;

    drawCell("Discount", startX + 300, y, 100, rowH, "right", true);
    drawCell(`-£${discount.toFixed(2)}`, startX + 400, y, 160, rowH, "right");
    y += rowH;

    if (invoice.vatIncluded) {
      drawCell("INCLUDING VAT.", startX + 300, y, 100, rowH, "right", true);
      drawCell(`£${vat.toFixed(2)}`, startX + 400, y, 160, rowH, "right");
      y += rowH;
    }

    drawCell("Total", startX + 300, y, 100, rowH, "right", true);
    drawCell(`£${total.toFixed(2)}`, startX + 400, y, 160, rowH, "right", true);
    y += rowH + 20;

    // ---------- Footer ----------
    doc.font("Helvetica").fontSize(8);
    doc.text("We are responsible for job done (above-mentioned) only. Please contact our customer service number in case of any issue relevant to job done.", startX, y, { width: tableWidth, align: "justify" });
    doc.moveDown(0.5);
    doc.text("Parts replaced can be taken at the time of car collection; later we dispose them. Please check your belongings before leaving the garage.", { width: tableWidth, align: "justify" });
    doc.moveDown(0.5);
    doc.text("SOP: 50% advance is required before starting the job.", { width: tableWidth, align: "justify" });
    doc.moveDown(0.5);
    doc.text("Bank Details: Perivale Motor Services1 LTD, Sort Code: 30-54-66, Account No: 32006468", { width: tableWidth, align: "justify" });
    doc.moveDown(1);
    doc.text("For __ PERIVALE MOTORS", { align: "left" });

    doc.end();
  } catch (err) {
    console.error("Error generating invoice PDF:", err);
    res.status(500).json({ message: "Failed to generate PDF", error: err.message });
  }
};
