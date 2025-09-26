import mongoose from "mongoose";
import Invoice from "../models/Invoice.js";
import Booking from "../models/Booking.js";
import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Auto-generate invoice number
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
// 🧾 Invoice Stats
// -----------------------------
export const getInvoiceStats = async (req, res) => {
  try {
    const total = await Invoice.countDocuments();
    const paid = await Invoice.countDocuments({ status: "Paid" });
    const unpaid = await Invoice.countDocuments({ status: "Unpaid" });
    const partial = await Invoice.countDocuments({ status: "Partial" });

    res.status(200).json({ total, paid, unpaid, partial });
  } catch (err) {
    console.error("Error fetching invoice stats:", err);
    res.status(500).json({ message: "Failed to get invoice stats", error: err.message });
  }
};

// -----------------------------
// 🧾 Generate (or Regenerate) Invoice by Booking ID
// -----------------------------
export const generateInvoiceByBookingId = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { createdBy, discountAmount = 0, vatIncluded = false, status = "Unpaid" } = req.body || {};

    if (!bookingId) return res.status(400).json({ message: "Booking ID is required" });

    const booking = await Booking.findById(bookingId)
      .populate("prebookingServices", "name")
      .populate("upsells.services", "name")
      .lean();

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Build invoice items
    const items = [];

    booking.prebookingServices?.forEach((service, index) => {
      items.push({
        description: `Prebooking ${index + 1} - ${service.name}`,
        amount: index === 0 ? Number(booking.prebookingBookingPrice || 0) : 0,
      });
    });

    booking.upsells?.forEach((upsell, index) => {
      upsell.services?.forEach((service) => {
        items.push({
          description: `Upsell ${index + 1} - ${service.name}`,
          amount: Number(upsell.upsellPrice || 0),
        });
      });
    });

    // Calculate totals
    const subtotal = items.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const afterDiscount = subtotal - Number(discountAmount || 0);
    const finalTotal = vatIncluded ? afterDiscount * 1.2 : afterDiscount;

    // Check for existing invoice
    let invoice = await Invoice.findOne({ booking: booking._id });
    if (invoice) {
      invoice.customerName = booking.ownerName;
      invoice.contactNo = booking.ownerNumber;
      invoice.email = booking.ownerEmail;
      invoice.vehicleRegNo = booking.vehicleRegNo;
      invoice.makeModel = booking.makeModel;
      invoice.postalCode = booking.ownerPostalCode;
      invoice.invoiceDate = new Date();
      invoice.items = items;
      invoice.discountAmount = discountAmount;
      invoice.vatIncluded = vatIncluded;
      invoice.status = status;
      invoice.totalAmount = finalTotal;
      invoice.createdBy = createdBy || booking.createdBy;

      await invoice.save();
      return res.status(200).json(invoice);
    }

    const invoiceNo = await generateInvoiceNo();
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
    console.error("Generate invoice error:", err);
    res.status(500).json({ message: "Failed to generate invoice", error: err.message });
  }
};

// -----------------------------
// 📌 Get Invoice by Booking ID
// -----------------------------
export const getInvoiceByBookingId = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) return res.status(400).json({ message: "Booking ID is required" });

    let invoice = await Invoice.findOne({ booking: bookingId }).lean();
    if (invoice) return res.status(200).json(invoice);

    return await generateInvoiceByBookingId(req, res);
  } catch (err) {
    console.error("Get invoice error:", err);
    res.status(500).json({ message: "Failed to fetch invoice", error: err.message });
  }
};

// -----------------------------
// 🧾 Get All Invoices
// -----------------------------
export const getAllInvoices = async (req, res) => {
  try {
    let { page = 1, limit = 20, search, fromDate, toDate, status } = req.query;
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { invoiceNo: regex },
        { customerName: regex },
        { contactNo: regex },
        { postalCode: regex },
        { vehicleRegNo: regex },
        { makeModel: regex },
      ];
    }

    if (fromDate || toDate) {
      filter.invoiceDate = {};
      if (fromDate) filter.invoiceDate.$gte = new Date(fromDate);
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        filter.invoiceDate.$lte = to;
      }
    }

    if (status) filter.status = status;

    const totalInvoices = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const invoicesWithRowNumber = invoices.map((inv, idx) => ({ ...inv, rowNumber: skip + idx + 1 }));

    res.status(200).json({
      data: invoicesWithRowNumber,
      pagination: {
        total: totalInvoices,
        page,
        limit,
        totalPages: Math.ceil(totalInvoices / limit),
        hasNextPage: page * limit < totalInvoices,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("Error fetching invoices:", err);
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

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const booking = await Booking.findById(invoice.booking).lean();
    if (!booking) return res.status(404).json({ message: "Linked booking not found" });

    invoice.customerName = booking.ownerName;
    invoice.contactNo = booking.ownerNumber;
    invoice.vehicleRegNo = booking.vehicleRegNo;
    invoice.makeModel = booking.makeModel;
    invoice.postalCode = booking.ownerPostalCode;

    if (Array.isArray(items)) {
      invoice.items = items.map((item) => ({
        description: item.description,
        amount: Number(item.amount || 0),
      }));
    }

    invoice.discountAmount = Number(discountAmount);
    invoice.vatIncluded = vatIncluded;
    if (status) invoice.status = status;

    const subtotal = invoice.items.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const afterDiscount = subtotal - invoice.discountAmount;
    invoice.totalAmount = vatIncluded ? afterDiscount * 1.2 : afterDiscount;

    await invoice.save();
    res.status(200).json(invoice);
  } catch (err) {
    console.error("Error updating invoice:", err);
    res.status(500).json({ message: "Failed to update invoice", error: err.message });
  }
};

// -----------------------------
// 🧾 PDF Generator
// -----------------------------
const generateInvoicePdf = (invoice, res, disposition = "inline", isProforma = false) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${disposition}; filename=${invoice.invoiceNo || "invoice"}.pdf`);

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);

  const logoPath = path.join(__dirname, "../public/logo.png");
  try {
    doc.opacity(0.1).image(logoPath, doc.page.width / 2 - 150, doc.page.height / 2 - 150, { width: 300 }).opacity(1);
  } catch {
    console.warn("Logo not found, skipping watermark");
  }

  doc.font("Helvetica-Bold").fontSize(14).text("PERIVALE MOTOR SERVICES 1", { align: "center" });
  doc.font("Helvetica").fontSize(10).text("67 Bideford Ave, Perivale, Greenford UB6 7PP, United Kingdom", { align: "center" });
  doc.text("Phone: +44 7907 070780", { align: "center" });
  if (invoice.vatIncluded) doc.text("VAT No: 488627727", { align: "center" });
  doc.moveDown(1);

  doc.font("Helvetica-Bold").fontSize(12).text(isProforma ? "PROFORMA INVOICE" : "CUSTOMER INVOICE", { align: "center" });
  doc.moveDown(0.5);

  const startX = 40, tableWidth = 520, rowH = 20;
  let y = doc.y + 5;

  const drawCell = (text, x, y, w, h, align = "left", bold = false) => {
    doc.rect(x, y, w, h).stroke();
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10).text(text, x + 4, y + 6, { width: w - 8, align });
  };

  // Invoice info
  drawCell("INVOICE #", startX, y, 130, rowH, "left", true);
  drawCell(invoice.invoiceNo || "—", startX + 130, y, 130, rowH);
  drawCell("Invoice Date", startX + 260, y, 130, rowH, "left", true);
  drawCell(invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-GB") : "—", startX + 390, y, 170, rowH);
  y += rowH;

  drawCell("Customer Name", startX, y, 130, rowH, true);
  drawCell(invoice.customerName || "—", startX + 130, y, 130, rowH);
  drawCell("Contact #", startX + 260, y, 130, rowH, true);
  drawCell(invoice.contactNo || "—", startX + 390, y, 170, rowH);
  y += rowH;

  drawCell("Vehicle Reg", startX, y, 130, rowH, true);
  drawCell(invoice.vehicleRegNo || "-", startX + 130, y, 130, rowH);
  drawCell("Make & Model", startX + 260, y, 130, rowH, true);
  drawCell(invoice.makeModel || "—", startX + 390, y, 170, rowH);
  y += rowH;

  drawCell("Postal Code", startX, y, 130, rowH, true);
  drawCell(invoice.postalCode || "—", startX + 130, y, 130, rowH);
  y += rowH + 10;

  // Items
  drawCell("Description", startX, y, 300, rowH, true);
  drawCell("Qty", startX + 300, y, 100, rowH, "center", true);
  drawCell("Amount", startX + 400, y, 160, rowH, "right", true);
  y += rowH;

  const items = invoice.items || [];
  const MIN_ROWS = 5;
  for (let i = 0; i < Math.max(items.length, MIN_ROWS); i++) {
    const item = items[i] || {};
    drawCell(item.description || "", startX, y, 300, rowH);
    drawCell(item.description ? "1" : "", startX + 300, y, 100, rowH, "center");
    drawCell(item.amount != null ? `£${Number(item.amount).toFixed(2)}` : "", startX + 400, y, 160, rowH, "right");
    y += rowH;
  }
  y += 10;

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
    drawCell("VAT (20%)", startX + 300, y, 100, rowH, "right", true);
    drawCell(`£${vat.toFixed(2)}`, startX + 400, y, 160, rowH, "right");
    y += rowH;
  }

  drawCell("Total", startX + 300, y, 100, rowH, "right", true);
  drawCell(`£${total.toFixed(2)}`, startX + 400, y, 160, rowH, "right", true);
  y += rowH + 20;

  // Footer
  y += 60;
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
};

// -----------------------------
// 🧾 View Invoice PDF Inline
// -----------------------------
export const viewInvoicePdf = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const isProforma = req.query.proforma === "true";

    const invoice = await Invoice.findById(invoiceId).lean();
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    generateInvoicePdf(invoice, res, "inline", isProforma);
  } catch (err) {
    console.error("Error generating invoice PDF:", err);
    res.status(500).json({ message: "Failed to view invoice PDF", error: err.message });
  }
};