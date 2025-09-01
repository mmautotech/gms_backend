import Invoice from "../models/invoiceModel.js";
import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

// Fix dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your existing Excel file
const excelFilePath = path.join(__dirname, "../data/invoices.xlsx");

export const createInvoice = async (req, res) => {
  try {
    const {
      invoiceNumber,
      customerName,
      items,
      totalAmount,
      advanceAmount,
      netReceivableAmount,
    } = req.body;

    // Save to MongoDB
    const invoice = new Invoice({
      invoiceNumber,
      customerName,
      items,
      totalAmount,
      advanceAmount,
      netReceivableAmount,
    });

    await invoice.save();

    // Load or create workbook
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.readFile(excelFilePath);
    } catch {
      // File does not exist, create new
      workbook.addWorksheet("Invoices");
    }

    const sheet = workbook.getWorksheet(1); // Use first sheet

    // If new sheet, add headers
    if (sheet.rowCount === 0) {
      sheet.addRow([
        "Invoice Number",
        "Customer Name",
        "Invoice Date",
        "Item Description",
        "Qty",
        "Rate",
        "Amount",
        "Total Amount",
        "Advance Amount",
        "Net Receivable",
      ]);
    }

    // Add each item as a new row
    invoice.items.forEach((item) => {
      sheet.addRow([
        invoiceNumber,
        customerName,
        invoice.invoiceDate.toISOString().split("T")[0],
        item.description,
        item.qty,
        item.rate,
        item.amount,
        totalAmount,
        advanceAmount,
        netReceivableAmount,
      ]);
    });

    // Save Excel file
    await workbook.xlsx.writeFile(excelFilePath);

    res.json({
      message: "Invoice created successfully & Excel updated",
      invoice,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create invoice" });
  }
};
