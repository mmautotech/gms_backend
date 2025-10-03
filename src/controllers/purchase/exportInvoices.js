import PDFDocument from "pdfkit";
import path from "path";
import PurchaseInvoice from "../../models/PurchaseInvoice.js";

const safeNumber = (val) => (typeof val === "number" && !isNaN(val) ? val : 0);

export const exportPurchaseInvoicePDF = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        if (!invoiceId) {
            return res.status(400).json({ success: false, error: "Invoice ID is required" });
        }

        const invoice = await PurchaseInvoice.findOne({ _id: invoiceId, isActive: true })
            .populate("supplier", "name contact")
            .populate("purchaser", "username")
            .populate("booking", "vehicleRegNo status scheduledDate")
            .populate("items.part", "partName price")
            .lean();

        if (!invoice) {
            return res.status(404).json({ success: false, error: "Invoice not found" });
        }

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="purchase_invoice_${invoiceId}.pdf"`);
        doc.pipe(res);

        const logoPath = path.join(process.cwd(), "src/public/logo.png");

        // --- Watermark
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        doc.save();
        doc.opacity(0.1);
        doc.image(logoPath, pageWidth / 2 - 150, pageHeight / 2 - 75, { width: 300 });
        doc.restore();

        // --- Header
        const headerY = 45;
        doc.image(logoPath, 50, headerY, { width: 80 });
        doc.font("Helvetica-Bold").fontSize(18).text("PERIVALE MOTOR SERVICES", 140, headerY + 15);
        doc.fontSize(14).text("PURCHASE INVOICE", 140, headerY + 40);

        // --- First Row (Supplier | Purchaser | Vehicle Reg No)
        const startY = headerY + 80;
        const boxHeight = 60;
        doc.rect(50, startY, 170, boxHeight).stroke();
        doc.rect(220, startY, 170, boxHeight).stroke();
        doc.rect(390, startY, 170, boxHeight).stroke();

        doc.font("Helvetica-Bold").fontSize(10);
        doc.text("Supplier:", 55, startY + 8);
        doc.text("Purchaser:", 225, startY + 8);
        doc.text("Vehicle Reg No:", 395, startY + 8);

        doc.font("Helvetica").fontSize(10);
        doc.text(`${invoice.supplier?.name || ""} (${invoice.supplier?.contact || ""})`, 55, startY + 25, { width: 160 });
        doc.text(invoice.purchaser?.username || "", 225, startY + 25, { width: 160 });
        doc.text(invoice.booking?.vehicleRegNo || "", 395, startY + 25, { width: 160 });

        // --- Second Row (Vendor Invoice # | Payment Date)
        const row2Y = startY + boxHeight + 10;
        doc.rect(50, row2Y, 255, boxHeight).stroke();
        doc.rect(305, row2Y, 255, boxHeight).stroke();

        doc.font("Helvetica-Bold").text("Vendor Invoice #:", 55, row2Y + 8);
        doc.font("Helvetica-Bold").text("Payment Date:", 310, row2Y + 8);

        doc.font("Helvetica").text(invoice.vendorInvoiceNumber || "", 55, row2Y + 25, { width: 240 });
        doc.text(invoice.paymentDate ? new Date(invoice.paymentDate).toLocaleDateString("en-GB") : "", 310, row2Y + 25, { width: 240 });

        // --- Parts Table (no Part Number)
        let tableTop = row2Y + boxHeight + 30;
        const rowHeight = 20;
        const positions = [50, 300, 400, 500];

        const drawRow = (y, row, bold = false) => {
            doc.font(bold ? "Helvetica-Bold" : "Helvetica");
            row.forEach((text, i) => {
                const x = positions[i];
                const cellWidth = (positions[i + 1] || 560) - positions[i];
                doc.rect(x, y, cellWidth, rowHeight).stroke();
                doc.text(text, x + 8, y + 5);
            });
        };

        drawRow(tableTop, ["Part Name", "QTY", "Rate (£)", "Total (£)"], true);
        tableTop += rowHeight;

        let netAmount = 0;
        (invoice.items || []).forEach((item) => {
            const qty = safeNumber(item.quantity);
            const rate = safeNumber(item.rate);
            const lineTotal = qty * rate;
            netAmount += lineTotal;

            drawRow(tableTop, [
                item.part?.partName || "Unknown",
                String(qty),
                rate.toFixed(2),
                lineTotal.toFixed(2),
            ]);
            tableTop += rowHeight;
        });

        // --- Summary
        const discount = safeNumber(invoice.discount);
        const vatAmount = invoice.vatIncluded ? (netAmount - discount) * 0.2 : 0;
        const grossTotal = netAmount - discount + vatAmount;

        const summaryY = tableTop + 30;
        doc.font("Helvetica-Bold").fontSize(11);
        doc.text(`Net Amount: £${netAmount.toFixed(2)}`, 400, summaryY);
        doc.text(`Discount: £${discount.toFixed(2)}`, 400, summaryY + 15);
        if (invoice.vatIncluded) {
            doc.text(`VAT (20%): £${vatAmount.toFixed(2)}`, 400, summaryY + 30);
        }
        doc.font("Helvetica-Bold").text(`Gross Total: £${grossTotal.toFixed(2)}`, 400, summaryY + 45);

        doc.end();
    } catch (err) {
        console.error("❌ Export Purchase Invoice PDF Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};
