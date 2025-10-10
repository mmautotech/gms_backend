// controllers/internalInvoices/viewInternalInvoicePdf.js
import path from "path";
import PDFDocument from "pdfkit";
import { fileURLToPath } from "url";
import InternalInvoice from "../../models/InternalInvoice.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ✅ Internal Invoice (Profit & Loss Style)
 * Opens inline in browser — with vendorInvoiceNumber and left-aligned section titles.
 */
export const viewInternalInvoicePdf = async (req, res) => {
    try {
        const { id } = req.params;

        // 🔍 Fetch Internal Invoice
        const inv = await InternalInvoice.findById(id)
            .populate({
                path: "invoice",
                populate: { path: "createdBy", select: "username" },
            })
            .populate({
                path: "purchaseInvoices",
                populate: [
                    { path: "items.part", select: "partName" },
                    { path: "supplier", select: "name contact" },
                ],
            })
            .populate("booking")
            .lean();

        if (!inv)
            return res.status(404).json({ message: "Internal invoice not found" });

        // 🧾 PDF Setup
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `inline; filename=internal_invoice_${id}.pdf`
        );

        const doc = new PDFDocument({ margin: 40, size: "A4" });
        doc.pipe(res);

        // 📌 Helpers
        const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "N/A");
        const round2 = (v) => Number((v || 0).toFixed(2));
        const fmtVal = (v) =>
            v == null || isNaN(v)
                ? "–"
                : v === 0
                    ? "–"
                    : v < 0
                        ? `(${Math.abs(v).toFixed(2)})`
                        : v.toFixed(2);

        const addLine = (
            label,
            value = "",
            bold = false,
            color = "#000",
            italic = false
        ) => {
            doc
                .font(
                    bold
                        ? "Helvetica-Bold"
                        : italic
                            ? "Helvetica-Oblique"
                            : "Helvetica"
                )
                .fontSize(10)
                .fillColor(color)
                .text(label, 60, doc.y, { width: 300 })
                .text(value, 400, doc.y, { width: 120, align: "right" });
            doc.moveDown(0.4);
            doc.fillColor("#000");
        };

        // 🧩 Header
        const logoPath = path.join(__dirname, "../../public/logo.png");
        try {
            doc.image(logoPath, 50, 35, { width: 60 });
        } catch {
            console.warn("⚠️ Logo not found:", logoPath);
        }

        doc
            .font("Helvetica-Bold")
            .fontSize(14)
            .text(process.env.COMPANY_NAME || "PERIVALE MOTOR SERVICES", 0, 40, {
                align: "center",
            });
        doc
            .font("Helvetica")
            .fontSize(10)
            .text("Internal Profitability Statement", { align: "center" });

        doc.moveDown(1.5);
        const startY = doc.y;

        // Booking Info
        doc.font("Helvetica-Bold").text("Booking Information", 60, startY);
        doc.font("Helvetica").fontSize(9);
        doc.text(
            `Booking #: ${inv.booking?._id?.toString().slice(-6).toUpperCase() || "N/A"
            }`
        );
        doc.text(`Invoice Date: ${fmtDate(inv.invoice?.createdAt)}`);
        doc.text(`Booking Date: ${fmtDate(inv.booking?.createdAt)}`);
        doc.text(`Generated On: ${fmtDate(new Date())}`);

        // Customer Info
        const rightX = 320;
        doc.font("Helvetica-Bold").text("Customer Information", rightX, startY);
        doc.font("Helvetica").fontSize(9);
        doc.text(`Name: ${inv.invoice?.customerName || "N/A"}`, rightX);
        doc.text(`Contact #: ${inv.invoice?.contactNo || "N/A"}`, rightX);
        doc.text(`Vehicle Reg: ${inv.booking?.vehicleRegNo || "N/A"}`, rightX);
        doc.text(`Make & Model: ${inv.booking?.makeModel || "N/A"}`, rightX);
        doc.text(`Postal Code: ${inv.invoice?.postalCode || "N/A"}`, rightX);

        // Separator
        doc.moveDown(1.2);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#555").stroke();
        doc.moveDown(0.8);

        // 💰 INCOME (Sales)
        doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .fillColor("#004AAD")
            .text("INCOME (Sales)", 60);
        doc.moveDown(0.5);

        const items = inv.invoice?.items || [];
        const isVat = !!inv.invoice?.vatIncluded;
        const discount = round2(inv.invoice?.discountAmount || 0);

        let totalRevenue = 0;
        let totalVat = 0;

        if (items.length === 0) {
            doc
                .font("Helvetica-Oblique")
                .fillColor("#666")
                .text("No invoice items recorded.", 60);
            doc.moveDown(0.5);
        } else {
            items.forEach((item) => {
                const base = round2(item.amount || 0);
                const vat = isVat ? round2(base * 0.2) : 0;
                addLine(`• ${item.description || "N/A"}`, fmtVal(base));
                totalRevenue += base;
                totalVat += vat;
            });
        }

        addLine("VAT (20%)", fmtVal(totalVat), false, "#666", true);
        addLine("Less: Discount", discount === 0 ? "–" : fmtVal(-discount));
        totalRevenue -= discount;
        totalRevenue += totalVat
        addLine("----------------------------------------", "", false);
        addLine("Total Revenue", `£${fmtVal(totalRevenue)}`, true);
        doc.moveDown(1);

        // 💸 EXPENSES (Purchases)
        doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .fillColor("#004AAD")
            .text("EXPENSES (Purchases)", 60);
        doc.moveDown(0.5);

        const purchases = inv.purchaseInvoices || [];
        let totalExpenses = 0;
        let totalPurchaseVat = 0;

        if (!purchases.length) {
            doc
                .font("Helvetica-Oblique")
                .fillColor("#666")
                .text("No purchase invoices recorded for this booking.", 60);
            doc.moveDown(1);
        } else {
            purchases.forEach((pi, index) => {
                doc
                    .font("Helvetica-Bold")
                    .fillColor("#000")
                    .text(
                        `Supplier: ${pi.supplier?.name || "N/A"} | Invoice #: ${pi.vendorInvoiceNumber || "N/A"
                        }`,
                        60
                    );
                if (pi.supplier?.contact)
                    doc
                        .font("Helvetica")
                        .fontSize(8)
                        .fillColor("#555")
                        .text(`Contact: ${pi.supplier.contact}`, 60);
                doc.moveDown(0.3);

                let purchaseSubtotal = 0;
                let purchaseVat = 0;

                pi.items?.forEach((p) => {
                    const base = round2((p.rate || 0) * (p.quantity || 1));
                    const vat = pi.vatIncluded ? round2(base * 0.2) : 0;
                    addLine(`   • ${p.part?.partName || "N/A"} × ${p.quantity}`, fmtVal(-base));
                    purchaseSubtotal += base;
                    purchaseVat += vat;
                });

                addLine("   VAT (20%)", fmtVal(-purchaseVat), false, "#666", true);
                const disc = round2(pi.discount || 0);
                addLine("   Less: Purchase Discount", disc === 0 ? "–" : fmtVal(-disc));

                purchaseSubtotal -= disc;
                totalExpenses += purchaseSubtotal + purchaseVat;
                totalPurchaseVat += purchaseVat;
                purchaseSubtotal += purchaseVat

                addLine("----------------------------------------", "", false);
                addLine(
                    `Total Purchase - ${pi.supplier?.name || "N/A"}`,
                    `£${fmtVal(-(purchaseSubtotal))}`,
                    true
                );
                if (index < purchases.length - 1) doc.moveDown(0.8);
            });
        }

        addLine("Total Expenses", `£${fmtVal(-totalExpenses)}`, true);
        doc.moveDown(1);

        // 📊 SUMMARY
        const grossProfit = totalRevenue - totalExpenses;
        const netVat = totalVat - totalPurchaseVat;
        const netProfit = grossProfit - netVat;

        doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .fillColor("#004AAD")
            .text("SUMMARY", 60);
        doc.moveDown(0.5);
        addLine(
            "Gross Profit",
            `£${fmtVal(grossProfit)}`,
            true,
            grossProfit < 0 ? "#B22222" : "#007200"
        );
        addLine("Net VAT (20%)", `£${fmtVal(netVat)}`, true, "#004AAD");
        addLine("----------------------------------------", "", false);
        addLine(
            "Net Profit",
            `£${fmtVal(netProfit)}`,
            true,
            netProfit < 0 ? "#B22222" : "#007200"
        );

        // 💧 Watermark
        if (process.env.NODE_ENV !== "production") {
            doc
                .fontSize(40)
                .fillColor("#EEEEEE")
                .rotate(-45, { origin: [250, 300] })
                .text("INTERNAL COPY", 100, 300, { opacity: 0.2 });
            doc.rotate(45);
        }

        // 📄 Footer
        doc.moveDown(2);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#999").stroke();
        doc
            .fontSize(8)
            .fillColor("#555")
            .text(
                `Generated on: ${fmtDate(new Date())} | Confidential Internal Statement`,
                0,
                doc.y + 4,
                { align: "center" }
            );

        doc.end();
    } catch (err) {
        console.error("❌ PDF Error:", err);
        if (!res.headersSent)
            res.status(500).json({
                success: false,
                message: "Failed to generate PDF",
                error: err.message,
            });
    }
};
