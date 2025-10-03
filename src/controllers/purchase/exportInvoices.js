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

        // Fetch invoice
        const invoice = await PurchaseInvoice.findOne({ _id: invoiceId, isActive: true })
            .populate("supplier", "name contact")
            .populate("purchaser", "username")
            .populate("booking", "vehicleRegNo status scheduledDate")
            .populate("items.part", "partName partNumber price")
            .lean();

        if (!invoice) {
            return res.status(404).json({ success: false, error: "Invoice not found" });
        }

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `inline; filename="purchase_invoice_${invoiceId}.pdf"`
        );
        doc.pipe(res);

        const logoPath = path.join(process.cwd(), "src/public/logo.png");

        // --- Watermark
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        doc.save();
        doc.opacity(0.1);
        doc.image(logoPath, pageWidth / 2 - 150, pageHeight / 2 - 75, { width: 300 });
        doc.restore();

        // --- Header: Logo + Company Name
        const headerY = 45;
        doc.image(logoPath, 50, headerY, { width: 80 }); // logo on left
        doc.font("Helvetica-Bold").fontSize(18).text("PERIVALE MOTOR SERVICES", 140, headerY + 15, { align: "left" });
        doc.fontSize(14).text("PURCHASE INVOICE", 140, headerY + 40, { align: "left" });

        // --- Boxed Details Section
        const startY = headerY + 80; // spacing below header
        const boxHeight = 80;

        doc.rect(50, startY, 510, boxHeight).stroke();
        doc.moveTo(50, startY + boxHeight / 2).lineTo(560, startY + boxHeight / 2).stroke();
        doc.moveTo(200, startY).lineTo(200, startY + boxHeight).stroke();
        doc.moveTo(350, startY).lineTo(350, startY + boxHeight).stroke();

        // --- Details Labels & Values
        const details = [
            [
                { label: "Purchaser:", value: invoice.purchaser?.username || "" },
                { label: "Vehicle Reg No:", value: invoice.booking?.vehicleRegNo || "" },
                { label: "Supplier:", value: `${invoice.supplier?.name || ""} (${invoice.supplier?.contact || ""})` },
            ],
            [
                { label: "Payment Date:", value: invoice.paymentDate ? new Date(invoice.paymentDate).toLocaleDateString("en-GB") : "" },
                { label: "Vendor Invoice #:", value: invoice.vendorInvoiceNumber || "" },
                { label: "Discount:", value: `£${safeNumber(invoice.discount).toFixed(2)}` },
            ],
        ];

        const columnOffset = 10; // horizontal padding inside each column

        details.forEach((row, rowIndex) => {
            row.forEach((cell, i) => {
                const xPos = 50 + i * 150 + columnOffset; // add horizontal spacing
                doc.font("Helvetica-Bold").fontSize(10).text(cell.label, xPos, startY + 5 + rowIndex * 40);
                doc.font("Helvetica").text(cell.value, xPos, startY + 20 + rowIndex * 40);
            });
        });

        doc.moveDown(6);

        // --- Table Headers
        const rowHeight = 20;
        let tableTop = startY + boxHeight + 40;
        const positions = [50, 220, 350, 420, 500, 560];

        const drawTableRow = (y, row, bold = false) => {
            doc.font(bold ? "Helvetica-Bold" : "Helvetica");
            for (let i = 0; i < row.length; i++) {
                const x = positions[i];
                const cellWidth = positions[i + 1] - positions[i];
                doc.rect(x, y, cellWidth, rowHeight).stroke();
                doc.text(row[i], x + 8, y + 5);
            }
        };

        drawTableRow(tableTop, ["Part Name", "Part Number", "QTY", "Rate (£)", "Total (£)"], true);
        tableTop += rowHeight;

        let subTotal = 0;
        (invoice.items || []).forEach((item) => {
            const qty = safeNumber(item.quantity);
            const rate = safeNumber(item.rate);
            const lineTotal = qty * rate;
            subTotal += lineTotal;

            drawTableRow(tableTop, [
                item.part?.partName || "Unknown",
                item.part?.partNumber || "-",
                String(qty),
                rate.toFixed(2),
                lineTotal.toFixed(2),
            ]);
            tableTop += rowHeight;
        });

        // --- VAT and Total Section
        const discount = safeNumber(invoice.discount);
        const totalAmount = subTotal - discount;
        const summaryBoxY = tableTop + 20;
        doc.font("Helvetica-Bold").fontSize(11);

        doc.rect(400, summaryBoxY, 160, 20).stroke();
        doc.text(`VAT Included: ${invoice.vatIncluded ? "Yes" : "No"}`, 405, summaryBoxY + 5);

        doc.rect(400, summaryBoxY + 25, 160, 70).stroke();
        doc.text(`Subtotal: £${subTotal.toFixed(2)}`, 405, summaryBoxY + 30);
        doc.text(`Discount: £${discount.toFixed(2)}`, 405, summaryBoxY + 45);
        doc.text(`Total: £${totalAmount.toFixed(2)}`, 405, summaryBoxY + 60);

        doc.end();
    } catch (err) {
        console.error("❌ Export Purchase Invoice PDF Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};
