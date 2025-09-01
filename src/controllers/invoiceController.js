// controllers/invoiceController.js
import Invoice from "../models/Invoice.js";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to Excel file
const excelFilePath = path.join(__dirname, "../data/invoices.xlsx");

/**
 * Generate Invoice from Booking ID
 */
export const createInvoiceFromBooking = async (req, res) => {
  try {
    const { bookingId, advanceAmount = 0 } = req.body;

    // Fetch booking
    const booking = await Booking.findById(bookingId)
      .populate("prebookingServices")
      .populate("services");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Build items
    const items = [];
    let totalAmount = 0;

    // Prebooking services
    if (booking.prebookingServices?.length) {
      booking.prebookingServices.forEach((service) => {
        const rate = 100; // TODO: real price
        const qty = 1;
        const amount = rate * qty;
        items.push({ description: service.name, qty, rate, amount });
        totalAmount += amount;
      });
    }

    // Extra services
    if (booking.services?.length) {
      booking.services.forEach((service) => {
        const rate = 150; // TODO: real price
        const qty = 1;
        const amount = rate * qty;
        items.push({ description: service.name, qty, rate, amount });
        totalAmount += amount;
      });
    }

    const netReceivableAmount = totalAmount - advanceAmount;

    // ✅ Generate invoice number
    const count = await Invoice.countDocuments();
    const invoiceNumber = `INV-${count + 1}`;

    // Create invoice
    const invoice = new Invoice({
      bookingId,
      invoiceNumber,
      customerName: booking.ownerName,
      contactNumber: booking.ownerNumber,
      makeModel: booking.makeModel,
      vehicleReg: booking.vehicleRegNo,
      items,
      totalAmount,
      advanceAmount,
      netReceivableAmount,
    });

    await invoice.save();

    // Append to Excel
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.readFile(excelFilePath);
    } catch {
      workbook.addWorksheet("Invoices");
    }
    const sheet = workbook.getWorksheet(1);

    if (sheet.rowCount === 0) {
      sheet.addRow([
        "Invoice Number",
        "Customer Name",
        "Contact Number",
        "Invoice Date",
        "Vehicle Reg",
        "Make & Model",
        "Item Description",
        "Qty",
        "Rate",
        "Amount",
        "Total Amount",
        "Advance Amount",
        "Net Receivable",
      ]);
    }

    items.forEach((item) => {
      sheet.addRow([
        invoiceNumber,
        booking.ownerName,
        booking.ownerNumber,
        invoice.invoiceDate.toISOString().split("T")[0],
        booking.vehicleRegNo,
        booking.makeModel,
        item.description,
        item.qty,
        item.rate,
        item.amount,
        totalAmount,
        advanceAmount,
        netReceivableAmount,
      ]);
    });

    await workbook.xlsx.writeFile(excelFilePath);

    res.json({
      success: true,
      message: "Invoice generated from booking",
      invoice,
    });
  } catch (err) {
    console.error("❌ Error in createInvoiceFromBooking:", err);
    res.status(500).json({ error: "Failed to generate invoice from booking" });
  }
};

// Update invoice by invoiceNumber
export const updateInvoice = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const updateData = req.body; // e.g., { customerName, items, totalAmount }

    const updatedInvoice = await Invoice.findOneAndUpdate(
      { invoiceNumber },
      updateData,
      { new: true } // returns the updated document
    );

    if (!updatedInvoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json({ message: 'Invoice updated successfully', invoice: updatedInvoice });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};



/**
 * Generate PDF invoice
 */
export const generateInvoicePDF = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;

    const invoice = await Invoice.findOne({ invoiceNumber }).lean();
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const pdfPath = path.join(__dirname, `../data/invoice_${invoiceNumber}.pdf`);
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // --- Header ---
    doc.fontSize(18).font("Helvetica-Bold").text("CUSTOMER INVOICE", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).font("Helvetica-Bold").text(`INVOICE # ${invoice.invoiceNumber}`);
    doc.font("Helvetica").text(`Invoice Date: ${invoice.invoiceDate.toISOString().split("T")[0]}`);
    doc.moveDown();

    // --- Customer Info ---
    doc.fontSize(11).text(`Customer Name: ${invoice.customerName}`);
    doc.text(`Contact #: ${invoice.contactNumber || "_________"}`);
    doc.text(`Vehicle Reg: ${invoice.vehicleReg || "_________"}`);
    doc.text(`Make n Model: ${invoice.makeModel || "_________"}`);
    doc.moveDown();

    // --- Table Header ---
    const tableTop = doc.y;
    const descX = 50, qtyX = 300, rateX = 370, amountX = 450;

    doc.font("Helvetica-Bold");
    doc.text("Description", descX, tableTop);
    doc.text("Qty", qtyX, tableTop);
    doc.text("Rate", rateX, tableTop);
    doc.text("Amount", amountX, tableTop);
    doc.moveTo(descX, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // --- Items ---
    doc.font("Helvetica").fontSize(10);
    let y = tableTop + 25;
    invoice.items.forEach((item) => {
      doc.text(item.description, descX, y);
      doc.text(item.qty, qtyX, y);
      doc.text(item.rate, rateX, y);
      doc.text(item.amount, amountX, y);
      y += 20;
    });

    // --- Totals ---
    y += 20;
    doc.font("Helvetica-Bold").text(`Advance: ${invoice.advanceAmount}`, descX, y);
    y += 15;
    doc.text(`Total: ${invoice.totalAmount}`, descX, y);
    y += 15;
    doc.text(`Net Receivable: ${invoice.netReceivableAmount}`, descX, y);

    doc.end();

    stream.on("finish", () => {
      res.download(pdfPath, `invoice_${invoiceNumber}.pdf`);
    });
  } catch (err) {
    console.error("❌ Error in generateInvoicePDF:", err);
    res.status(500).json({ error: "Failed to generate invoice PDF" });
  }
};
