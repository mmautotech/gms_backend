import PDFDocument from "pdfkit";
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
            .populate("items.part", "partName partNumber price")
            .lean();

        if (!invoice) {
            return res.status(404).json({ success: false, error: "Invoice not found" });
        }

        const doc = new PDFDocument({ margin: 50 });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `inline; filename="purchase_invoice_${invoiceId}.pdf"`
        );

        doc.pipe(res);

        // --- Title
        doc.font("Helvetica-Bold").fontSize(20).text("Purchase Invoice", { align: "center" });
        doc.moveDown(2);

        // --- Invoice Info
        doc.font("Helvetica-Bold").fontSize(14).text(`Invoice #${invoiceId}`, { underline: true });
        doc.moveDown(0.5);

        doc.font("Helvetica").fontSize(12).text(`Purchaser: ${invoice.purchaser?.username || ""}`);
        doc.text(`Supplier: ${invoice.supplier?.name || ""} (${invoice.supplier?.contact || ""})`);
        doc.text(`Booking Reg No: ${invoice.booking?.vehicleRegNo || ""}`);
        doc.text(`Booking Status: ${invoice.booking?.status || ""}`);
        doc.text(
            `Scheduled Date: ${invoice.booking?.scheduledDate
                ? new Date(invoice.booking.scheduledDate).toLocaleDateString("en-GB")
                : ""
            }`
        );
        doc.text(
            `Payment Date: ${invoice.paymentDate
                ? new Date(invoice.paymentDate).toLocaleDateString("en-GB")
                : ""
            }`
        );
        doc.text(`Payment Status: ${invoice.paymentStatus}`);
        doc.text(`Vendor Invoice #: ${invoice.vendorInvoiceNumber}`);
        doc.text(`VAT Included: ${invoice.vatIncluded ? "Yes" : "No"}`);
        doc.text(`Discount: £${safeNumber(invoice.discount).toFixed(2)}`);
        doc.moveDown(1);

        // --- Items Table
        doc.font("Helvetica-Bold").text("Items:", { underline: true });
        doc.moveDown(0.5);

        const col1 = 50,
            col2 = 250,
            col3 = 350,
            col4 = 420,
            col5 = 500;

        doc.fontSize(11).text("Part Name", col1, doc.y, { continued: true });
        doc.text("Part Number", col2, doc.y, { continued: true });
        doc.text("Qty", col3, doc.y, { continued: true });
        doc.text("Rate (£)", col4, doc.y, { continued: true });
        doc.text("Line Total (£)", col5, doc.y);
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
        doc.moveDown(0.3);

        doc.font("Helvetica");
        (invoice.items || []).forEach((item) => {
            const qty = safeNumber(item.quantity);
            const rate = safeNumber(item.rate);
            const lineTotal = rate * qty;

            doc.text(item.part?.partName || "Unknown", col1, doc.y, { continued: true });
            doc.text(item.part?.partNumber || "-", col2, doc.y, { continued: true });
            doc.text(String(qty), col3, doc.y, { continued: true });
            doc.text(rate.toFixed(2), col4, doc.y, { continued: true });
            doc.text(lineTotal.toFixed(2), col5, doc.y);
        });

        doc.moveDown(1);
        doc.font("Helvetica-Bold").text(
            `Total Amount: £${safeNumber(invoice.totalAmount).toFixed(2)}`,
            { align: "right" }
        );
        doc.font("Helvetica");

        doc.end();
    } catch (err) {
        console.error("❌ Export Purchase Invoice PDF Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};
