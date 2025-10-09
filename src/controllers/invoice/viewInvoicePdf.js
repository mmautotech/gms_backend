import Invoice from "../../models/Invoice.js";
import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 🧾 Generate Invoice PDF (inline view)
 */
const generateInvoicePdf = (invoice, res, disposition = "inline", isProforma = false) => {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `${disposition}; filename=${invoice.invoiceNo || "invoice"}.pdf`
    );

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    const logoPath = path.join(process.cwd(), "public", "logo.png");
    try {
        doc.opacity(0.1).image(logoPath, doc.page.width / 2 - 150, doc.page.height / 2 - 150, { width: 300 }).opacity(1);
    } catch {
        console.warn("⚠️ Logo not found, skipping watermark");
    }

    doc.font("Helvetica-Bold").fontSize(14).text("PERIVALE MOTOR SERVICES", { align: "center" });
    doc.font("Helvetica").fontSize(10).text("67 Bideford Ave, Perivale, Greenford UB6 7PP, United Kingdom", { align: "center" });
    doc.text("Phone: +44 7907 070780", { align: "center" });
    if (invoice.vatIncluded) doc.text("VAT No: 488627727", { align: "center" });
    doc.moveDown(1);

    doc.font("Helvetica-Bold").fontSize(12).text(isProforma ? "PROFORMA INVOICE" : "CUSTOMER INVOICE", { align: "center" });
    doc.moveDown(0.5);

    // --- Table Drawing ---
    const startX = 40, rowH = 20;
    let y = doc.y + 5;

    const drawCell = (text, x, y, w, h, align = "left", bold = false) => {
        doc.rect(x, y, w, h).stroke();
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10).text(text, x + 4, y + 6, { width: w - 8, align });
    };

    const subtotal = invoice.items.reduce((s, i) => s + Number(i.amount || 0), 0);
    const discount = Number(invoice.discountAmount || 0);
    const vat = invoice.vatIncluded ? (subtotal - discount) * 0.2 : 0;
    const total = subtotal - discount + vat;

    // Invoice metadata
    drawCell("Invoice #", startX, y, 130, rowH, "left", true);
    drawCell(invoice.invoiceNo || "—", startX + 130, y, 130, rowH);
    drawCell("Invoice Date", startX + 260, y, 130, rowH, "left", true);
    drawCell(invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-GB") : "—", startX + 390, y, 170, rowH);
    y += rowH;

    drawCell("Customer", startX, y, 130, rowH, true);
    drawCell(invoice.customerName || "—", startX + 130, y, 130, rowH);
    drawCell("Contact #", startX + 260, y, 130, rowH, true);
    drawCell(invoice.contactNo || "—", startX + 390, y, 170, rowH);
    y += rowH;

    drawCell("Vehicle", startX, y, 130, rowH, true);
    drawCell(invoice.vehicleRegNo || "-", startX + 130, y, 130, rowH);
    drawCell("Model", startX + 260, y, 130, rowH, true);
    drawCell(invoice.makeModel || "—", startX + 390, y, 170, rowH);
    y += rowH + 10;

    // Items
    drawCell("Description", startX, y, 300, rowH, true);
    drawCell("Amount", startX + 300, y, 250, rowH, "right", true);
    y += rowH;

    invoice.items.forEach((item) => {
        drawCell(item.description || "", startX, y, 300, rowH);
        drawCell(`£${Number(item.amount || 0).toFixed(2)}`, startX + 300, y, 250, rowH, "right");
        y += rowH;
    });

    // Totals
    y += 10;
    drawCell("Subtotal", startX + 300, y, 100, rowH, "right", true);
    drawCell(`£${subtotal.toFixed(2)}`, startX + 400, y, 150, rowH, "right");
    y += rowH;

    drawCell("Discount", startX + 300, y, 100, rowH, "right", true);
    drawCell(`-£${discount.toFixed(2)}`, startX + 400, y, 150, rowH, "right");
    y += rowH;

    if (invoice.vatIncluded) {
        drawCell("VAT (20%)", startX + 300, y, 100, rowH, "right", true);
        drawCell(`£${vat.toFixed(2)}`, startX + 400, y, 150, rowH, "right");
        y += rowH;
    }

    drawCell("Total", startX + 300, y, 100, rowH, "right", true);
    drawCell(`£${total.toFixed(2)}`, startX + 400, y, 150, rowH, "right", true);
    doc.end();
};

/**
 * 🧾 View Invoice PDF Inline
 */
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
