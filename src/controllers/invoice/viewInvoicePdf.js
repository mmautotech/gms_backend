// controllers/invoice/viewInvoicePdf.js
import Invoice from "../../models/Invoice.js";
import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------
// 🧾 Generate Invoice PDF
// -----------------------------
const generateInvoicePdf = (invoice, res, disposition = "inline", isProforma = false) => {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `${disposition}; filename=${invoice.invoiceNo || "invoice"}.pdf`
    );

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    // 🖼️ Watermark Logo
    const logoPath = path.join(__dirname, "../../public/logo.png");
    try {
        doc
            .opacity(0.1)
            .image(logoPath, doc.page.width / 2 - 150, doc.page.height / 2 - 150, { width: 300 })
            .opacity(1);
    } catch {
        console.warn("⚠️ Logo not found, skipping watermark");
    }

    // 🏢 Header
    doc.font("Helvetica-Bold").fontSize(14).text("PERIVALE MOTOR SERVICES 1", { align: "center" });
    doc.font("Helvetica").fontSize(10).text("67 Bideford Ave, Perivale, Greenford UB6 7PP, United Kingdom", { align: "center" });
    doc.text("Phone: +44 7907 070780", { align: "center" });
    if (invoice.vatIncluded) doc.text("VAT No: 488627727", { align: "center" });
    doc.moveDown(1);

    doc.font("Helvetica-Bold").fontSize(12).text(isProforma ? "PROFORMA INVOICE" : "CUSTOMER INVOICE", { align: "center" });
    doc.moveDown(0.5);

    // 🧾 Table Setup
    const startX = 40;
    const tableWidth = 520;
    const rowH = 20;
    let y = doc.y + 5;

    const drawCell = (text, x, y, w, h, align = "left", bold = false) => {
        doc.rect(x, y, w, h).stroke();
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10).text(text, x + 4, y + 6, { width: w - 8, align });
    };

    // 🔹 Invoice Metadata
    drawCell("INVOICE #", startX, y, 130, rowH, "left", true);
    drawCell(invoice.invoiceNo || "—", startX + 130, y, 130, rowH);
    drawCell("Invoice Date", startX + 260, y, 130, rowH, "left", true);
    drawCell(invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString("en-GB") : "—", startX + 390, y, 170, rowH);
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

    // 🧾 Items Table Header
    drawCell("Description", startX, y, 300, rowH, true);
    drawCell("Qty", startX + 300, y, 100, rowH, "center", true);
    drawCell("Amount", startX + 400, y, 160, rowH, "right", true);
    y += rowH;

    // 🔹 Line Items
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

    // 🧮 Totals Calculation
    const subtotal = items.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const discount = Number(invoice.discountAmount || 0);
    const vat = invoice.vatIncluded ? (subtotal - discount) * 0.2 : 0;
    const total = subtotal - discount + vat;

    // Totals Rows
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

    // 🧾 Footer Notes
    y += 90;
    doc.font("Helvetica").fontSize(8);
    doc.text(
        "We are responsible for job done (above-mentioned) only. Please contact our customer service number in case of any issue relevant to job done.",
        startX,
        y,
        { width: tableWidth, align: "justify" }
    );
    doc.moveDown(0.5);
    doc.text(
        "Parts replaced can be taken at the time of car collection; later we dispose them. Please check your belongings before leaving the garage.",
        { width: tableWidth, align: "justify" }
    );
    doc.moveDown(0.5);
    doc.text("SOP: 50% advance is required before starting the job.", {
        width: tableWidth,
        align: "justify",
    });
    doc.moveDown(0.5);
    doc.text("Bank Details: Perivale Motor Services1 LTD, Sort Code: 30-54-66, Account No: 32006468", {
        width: tableWidth,
        align: "justify",
    });
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
        console.error("❌ Error generating invoice PDF:", err);
        res.status(500).json({ message: "Failed to view invoice PDF", error: err.message });
    }
};
