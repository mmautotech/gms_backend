// controllers/internalInvoiceController.js
import InternalInvoice from "../models/InternalInvoice.js";
import Invoice from "../models/Invoice.js";
import PurchaseInvoice from "../models/PurchaseInvoice.js";

/**
 * ✅ Create an internal invoice
 * Requires invoiceId from frontend
 */
export const createInternalInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.body;

        // fetch invoice
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });

        // fetch all purchase invoices for this booking
        const purchaseInvoices = await PurchaseInvoice.find({ booking: invoice.booking });
        if (!purchaseInvoices || purchaseInvoices.length === 0) {
            return res.status(404).json({ message: "Purchase invoice not found for this booking" });
        }

        const VAT_RATE = 0.2; // 20% VAT

        // ==============================
        // REVENUE calculation
        // ==============================
        let revenue = 0;
        if (invoice.items && invoice.items.length > 0) {
            invoice.items.forEach((item) => {
                const base = item.amount || 0;
                revenue += invoice.vatIncluded ? base + base * VAT_RATE : base;
            });
        } else {
            revenue = invoice.totalAmount || 0;
        }

        // ==============================
        // COST calculation
        // ==============================
        let cost = 0;
        purchaseInvoices.forEach((pi) => {
            pi.items?.forEach((item) => {
                const base = (item.rate || 0) * (item.quantity || 1);
                cost += pi.vatIncluded ? base + base * VAT_RATE : base;
            });
        });

        // PROFIT
        const profit = revenue - cost;

        // ✅ check if internal invoice already exists
        let internalInvoice = await InternalInvoice.findOne({
            booking: invoice.booking,
            invoice: invoice._id,
        });

        if (internalInvoice) {
            // ✅ update existing
            internalInvoice.purchaseInvoices = purchaseInvoices.map((pi) => pi._id);
            internalInvoice.revenue = revenue;
            internalInvoice.cost = cost;
            internalInvoice.profit = profit;
            internalInvoice.updatedBy = req.user?._id;

            await internalInvoice.save();

            return res.status(200).json({
                message: "Internal invoice updated successfully",
                data: internalInvoice,
            });
        } else {
            // ✅ create new
            internalInvoice = new InternalInvoice({
                booking: invoice.booking,
                invoice: invoice._id,
                purchaseInvoices: purchaseInvoices.map((pi) => pi._id),
                revenue,
                cost,
                profit,
                createdBy: req.user?._id,
            });

            await internalInvoice.save();

            return res.status(201).json({
                message: "Internal invoice created successfully",
                data: internalInvoice,
            });
        }
    } catch (err) {
        console.error("❌ Error creating/updating internal invoice:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * ✅ Get paginated internal invoices with optional filters
 */
export const getInternalInvoices = async (req, res) => {
    try {
        const { page = 1, limit = 10, fromDate, toDate, vehicleRegNo } = req.query;

        const query = {};

        // Filter by fromDate and toDate
        if (fromDate || toDate) {
            query.createdAt = {};
            if (fromDate) query.createdAt.$gte = new Date(fromDate);
            if (toDate) {
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999); // include full day
                query.createdAt.$lte = to;
            }
        }

        // Fetch all invoices first
        let records = await InternalInvoice.find()
            .populate("invoice")
            .populate({
                path: "purchaseInvoices",
                populate: { path: "items.part", select: "partName" },
            })
            .populate("booking");

        // Apply vehicleRegNo filter in memory after population
        if (vehicleRegNo) {
            const regex = new RegExp(vehicleRegNo, "i");
            records = records.filter(
                (inv) => inv.booking?.vehicleRegNo && regex.test(inv.booking.vehicleRegNo)
            );
        }

        // Apply createdAt filter in memory (for safety)
        if (query.createdAt) {
            records = records.filter((inv) => {
                const created = new Date(inv.createdAt);
                if (query.createdAt.$gte && created < query.createdAt.$gte) return false;
                if (query.createdAt.$lte && created > query.createdAt.$lte) return false;
                return true;
            });
        }

        // Pagination
        const total = records.length;
        const paginatedRecords = records.slice((page - 1) * limit, page * limit);

        // format response
        const data = paginatedRecords.map((inv) => {
            const items = [];

            inv.invoice?.items?.forEach((i) => {
                items.push({
                    description: i.description,
                    type: "Invoice",
                    quantity: 1,
                    cost: 0,
                    selling: i.amount,
                    vatIncluded: inv.invoice?.vatIncluded,
                    total: i.amount,
                    status: inv.invoice?.status,
                });
            });

            inv.purchaseInvoices?.forEach((pi) => {
                pi.items?.forEach((i) => {
                    items.push({
                        description: i.part?.partName || "N/A",
                        type: "Purchase",
                        quantity: i.quantity,
                        cost: i.rate || 0,
                        selling: 0,
                        vatIncluded: pi.vatIncluded,
                        total: i.rate * i.quantity,
                        status: pi.paymentStatus,
                    });
                });
            });

            return {
                _id: inv._id,
                booking: inv.booking,
                invoice: inv.invoice,
                purchaseInvoices: inv.purchaseInvoices,
                revenue: inv.revenue,
                cost: inv.cost,
                profit: inv.profit,
                createdAt: inv.createdAt,
                updatedAt: inv.updatedAt,
                items,
            };
        });

        res.json({
            data,
            pagination: {
                total,
                page: Number(page),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching Internal Invoices:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * ✅ Get Internal Invoice by ID
 */
export const getInternalInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;

        const inv = await InternalInvoice.findById(id)
            .populate("invoice")
            .populate({
                path: "purchaseInvoices",
                populate: { path: "items.part", select: "partName" },
            })
            .populate("booking");

        if (!inv) return res.status(404).json({ message: "Internal invoice not found" });

        const items = [];

        inv.invoice?.items?.forEach((i) => {
            items.push({
                description: i.description,
                type: "Invoice",
                quantity: 1,
                cost: 0,
                selling: i.amount,
                vatIncluded: inv.invoice?.vatIncluded,
                total: i.amount,
                status: inv.invoice?.status,
            });
        });

        inv.purchaseInvoices?.forEach((pi) => {
            pi.items?.forEach((i) => {
                items.push({
                    description: i.part?.partName || "N/A",
                    type: "Purchase",
                    quantity: i.quantity,
                    cost: i.rate || 0,
                    selling: 0,
                    vatIncluded: pi.vatIncluded,
                    total: i.rate * i.quantity,
                    status: pi.paymentStatus,
                });
            });
        });

        res.json({
            data: {
                _id: inv._id,
                booking: inv.booking,
                invoice: inv.invoice,
                purchaseInvoices: inv.purchaseInvoices,
                revenue: inv.revenue,
                cost: inv.cost,
                profit: inv.profit,
                createdAt: inv.createdAt,
                updatedAt: inv.updatedAt,
                items,
            },
        });
    } catch (error) {
        console.error("Error fetching Internal Invoice:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ==========================
// 🧾 View Internal Invoice PDF Inline (Professional Version)
// ==========================
import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const viewInternalInvoicePdf = async (req, res) => {
    try {
        const { id } = req.params;

        const inv = await InternalInvoice.findById(id)
            .populate("invoice")
            .populate({
                path: "purchaseInvoices",
                populate: { path: "items.part", select: "partName" },
            })
            .populate("booking")
            .lean();

        if (!inv) return res.status(404).json({ message: "Internal invoice not found" });

        // ✅ PDF Setup
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=internal_${id}.pdf`);

        const doc = new PDFDocument({ margin: 40 });
        doc.pipe(res);

        // ------------------ HEADER ------------------
        const logoPath = path.join(__dirname, "../public/logo.png");
        try {
            doc.image(logoPath, 60, 40, { width: 80 });
        } catch {
            console.warn("⚠️ Logo not found, skipping.");
        }

        doc.y = 90;
        doc.font("Helvetica-Bold").fontSize(16).text("PERIVALE MOTOR SERVICES 1", { align: "center" });
        doc.font("Helvetica").fontSize(10).text("Internal Profitability Report", { align: "center" });
        doc.moveDown(2);

        const startX = 40;
        const rowH = 20;
        let y = doc.y + 10;

        // Draw cell utility
        const drawCell = (text, x, y, w, h, align = "left", bold = false, shaded = false) => {
            if (shaded) {
                doc.rect(x, y, w, h).fillAndStroke("#f5f5f5", "black");
                doc.fillColor("#000");
            } else {
                doc.rect(x, y, w, h).stroke();
                doc.fillColor("#000");
            }
            doc.font(bold ? "Helvetica-Bold" : "Helvetica")
                .fontSize(10)
                .text(text, x + 4, y + 6, { width: w - 8, align });
        };

        // ------------------ HEADER TABLE ------------------
        drawCell("INVOICE #", startX, y, 130, rowH, "left", true);
        drawCell(inv.invoice?.invoiceNo || "N/A", startX + 130, y, 130, rowH);
        drawCell("Invoice Date", startX + 260, y, 130, rowH, "left", true);
        drawCell(new Date(inv.createdAt).toLocaleDateString("en-GB"), startX + 390, y, 160, rowH);
        y += rowH;

        drawCell("Customer Name", startX, y, 130, rowH, "left", true);
        drawCell(inv.invoice?.customerName || "N/A", startX + 130, y, 130, rowH);
        drawCell("Contact #", startX + 260, y, 130, rowH, "left", true);
        drawCell(inv.invoice?.contactNo || "N/A", startX + 390, y, 160, rowH);
        y += rowH;

        drawCell("Vehicle Reg", startX, y, 130, rowH, "left", true);
        drawCell(inv.booking?.vehicleRegNo || "N/A", startX + 130, y, 130, rowH);
        drawCell("Make & Model", startX + 260, y, 130, rowH, "left", true);
        drawCell(inv.booking?.makeModel || "N/A", startX + 390, y, 160, rowH);
        y += rowH;

        drawCell("Postal Code", startX, y, 130, rowH, "left", true);
        drawCell(inv.invoice?.postalCode || "N/A", startX + 130, y, 130, rowH);
        y += rowH + 30;

        // ------------------ SUMMARY TABLE HEADER ------------------
        drawCell("Description", startX, y, 225, rowH, true, "left", true);
        drawCell("Type", startX + 225, y, 75, rowH, true, "center", true);
        drawCell("Amount (+/-)", startX + 300, y, 100, rowH, true, "right", true);
        drawCell("VAT (20%)", startX + 400, y, 75, rowH, true, "right", true);
        drawCell("Revenue / Expense", startX + 475, y, 75, rowH, true, "right", true);
        y += rowH;

        // ------------------ ITEMS ------------------
        const items = [];
        inv.invoice?.items?.forEach(i =>
            items.push({ desc: i.description, type: "Invoice", cost: 0, revenue: i.amount })
        );
        inv.purchaseInvoices?.forEach(pi =>
            pi.items?.forEach(i =>
                items.push({
                    desc: i.part?.partName || "N/A",
                    type: "Purchase",
                    cost: i.rate * i.quantity,
                    revenue: 0
                })
            )
        );

        let totalVat = 0;
        let totalRevenue = 0;
        let totalProfit = 0;

        const addRow = (i) => {
            const isRevenue = i.revenue > 0;
            const base = isRevenue ? i.revenue : -i.cost;
            const vat = Math.abs(base * 0.2);
            const profit = i.revenue - i.cost;

            totalVat += vat;
            totalRevenue += isRevenue ? base : 0;
            totalProfit += profit;

            // Page break if nearing bottom
            if (y > 720) {
                doc.addPage();
                y = 50;
                drawCell("Description", startX, y, 225, rowH, true, "left", true);
                drawCell("Type", startX + 225, y, 75, rowH, true, "center", true);
                drawCell("Amount (+/-)", startX + 300, y, 100, rowH, true, "right", true);
                drawCell("VAT (20%)", startX + 400, y, 75, rowH, true, "right", true);
                drawCell("Revenue / Expense", startX + 475, y, 75, rowH, true, "right", true);
                y += rowH;
            }

            drawCell(i.desc, startX, y, 225, rowH);
            drawCell(i.type, startX + 225, y, 75, rowH, false, "center");
            drawCell(`${isRevenue ? "+" : "-"}£${Math.abs(base).toFixed(2)}`, startX + 300, y, 100, rowH, false, "right");
            drawCell(`£${vat.toFixed(2)}`, startX + 400, y, 75, rowH, false, "right");

            // Profit color coded
            doc.fillColor(profit >= 0 ? "#007200" : "#B22222");
            drawCell(`£${profit.toFixed(2)}`, startX + 475, y, 75, rowH, false, "right");
            doc.fillColor("#000");
            y += rowH;
        };

        items.forEach(addRow);

        // ------------------ TOTALS SECTION ------------------
        y += 25;
        const totalBoxX = startX + 220;

        const drawTotalRow = (label, value, isBold = false, shaded = false) => {
            if (shaded) doc.rect(totalBoxX, y, 330, rowH).fillAndStroke("#f5f5f5", "black");
            doc.fillColor("#000");
            doc.font(isBold ? "Helvetica-Bold" : "Helvetica").fontSize(10);
            doc.text(label, totalBoxX + 5, y + 6, { width: 160, align: "right" });
            doc.text(`£${value.toFixed(2)}`, totalBoxX + 165, y + 6, { width: 160, align: "right" });
            doc.rect(totalBoxX, y, 330, rowH).stroke();
            y += rowH;
        };

        drawTotalRow("Total Revenue", totalRevenue, true, true);
        drawTotalRow("Total VAT (20%)", totalVat, true);
        drawTotalRow("Net Profit", totalProfit, true, true);

        // ------------------ FOOTER ------------------
        doc.moveTo(40, y + 15).lineTo(550, y + 15).stroke();
        doc.moveDown(1.5);
        doc.fontSize(8).fillColor("#555")
            .text(
                `Generated on: ${new Date().toLocaleDateString("en-GB")}  |  Confidential Internal Report`,
                { align: "center" }
            );

        // End PDF
        doc.end();

    } catch (err) {
        console.error("❌ Error generating internal invoice PDF:", err);
        res.status(500).json({
            message: "Failed to generate internal invoice PDF",
            error: err.message
        });
    }
};
