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
// 🧾 View Internal Invoice PDF Inline (with Net VAT + Watermark)
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

        const doc = new PDFDocument({ margin: 40, size: "A4" });
        doc.pipe(res);

        // ------------------ 🔒 CONFIDENTIAL WATERMARK ------------------
        const watermark = (page) => {
            const { width, height } = page;
            doc.save();
            doc.font("Helvetica-Bold")
                .fontSize(80)
                .fillColor("lightgrey")
                .rotate(-45, { origin: [width / 2, height / 2] })
                .opacity(0.50)
                .text("CONFIDENTIAL", width / 4, height / 2, {
                    align: "center",
                    width: width / 2,
                });
            doc.opacity(1).restore(); // reset opacity and rotation
        };

        // Add watermark to first page
        watermark(doc.page);

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
        let rowH = 20;
        let y = doc.y + 10;

        const drawCell = (text, x, y, w, h, align = "left", bold = false, shaded = false) => {
            if (shaded) {
                doc.rect(x, y, w, h).fillAndStroke("#f0f0f0", "black");
                doc.fillColor("#000");
            } else {
                doc.rect(x, y, w, h).stroke();
                doc.fillColor("#000");
            }
            doc.font(bold ? "Helvetica-Bold" : "Helvetica")
                .fontSize(9.5)
                .text(text, x + 3, y + 5, { width: w - 6, align });
        };

        // ------------------ HEADER TABLE ------------------
        drawCell("INVOICE #", startX, y, 120, rowH, "left", true);
        drawCell(inv.invoice?.invoiceNo || "N/A", startX + 120, y, 120, rowH);
        drawCell("Invoice Date", startX + 240, y, 120, rowH, "left", true);
        drawCell(new Date(inv.createdAt).toLocaleDateString("en-GB"), startX + 360, y, 160, rowH);
        y += rowH;

        drawCell("Customer Name", startX, y, 120, rowH, "left", true);
        drawCell(inv.invoice?.customerName || "N/A", startX + 120, y, 120, rowH);
        drawCell("Contact #", startX + 240, y, 120, rowH, "left", true);
        drawCell(inv.invoice?.contactNo || "N/A", startX + 360, y, 160, rowH);
        y += rowH;

        drawCell("Vehicle Reg", startX, y, 120, rowH, "left", true);
        drawCell(inv.booking?.vehicleRegNo || "N/A", startX + 120, y, 120, rowH);
        drawCell("Make & Model", startX + 240, y, 120, rowH, "left", true);
        drawCell(inv.booking?.makeModel || "N/A", startX + 360, y, 160, rowH);
        y += rowH;

        drawCell("Postal Code", startX, y, 120, rowH, "left", true);
        drawCell(inv.invoice?.postalCode || "N/A", startX + 120, y, 120, rowH);
        y += rowH + 25;

        // --- MAIN TABLE HEADER (adjusted spacing) ---
        rowH += 10;
        drawCell("#", startX, y, 25, rowH, "center", true, true);
        drawCell("Description", startX + 25, y, 175, rowH, "left", true, true);
        drawCell("Type", startX + 200, y, 70, rowH, "center", true, true);
        drawCell("Amount (+/-)", startX + 270, y, 90, rowH, "right", true, true);
        drawCell("VAT (20%)", startX + 360, y, 80, rowH, "right", true, true);
        drawCell("Revenue / Expense", startX + 440, y, 100, rowH, "right", true, true);
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

        let vatOnRevenue = 0;
        let vatOnCost = 0;
        let totalRevenue = 0;
        let totalProfit = 0;

        items.forEach((i, index) => {
            const isRevenue = i.revenue > 0;
            const base = isRevenue ? i.revenue : -i.cost;
            const vat = Math.abs(base * 0.2);
            const profit = i.revenue - i.cost;

            if (isRevenue) vatOnRevenue += vat;
            else vatOnCost += vat;

            totalRevenue += isRevenue ? base : 0;
            totalProfit += profit;

            drawCell(String(index + 1), startX, y, 25, rowH, "center");
            drawCell(i.desc, startX + 25, y, 175, rowH);
            drawCell(i.type, startX + 200, y, 70, rowH, false, "center");
            drawCell(`${isRevenue ? "+" : "-"}£${Math.abs(base).toFixed(2)}`, startX + 270, y, 90, rowH, false, "right");
            drawCell(`£${vat.toFixed(2)}`, startX + 360, y, 80, rowH, false, "right");

            doc.fillColor(profit >= 0 ? "#007200" : "#B22222");
            drawCell(`£${profit.toFixed(2)}`, startX + 440, y, 100, rowH, false, "right");
            doc.fillColor("#000");

            y += rowH;
        });

        const netVat = vatOnRevenue - vatOnCost;

        // ------------------ TOTALS ------------------
        y += 75;
        const totalBoxX = startX + 160;
        const totalBoxW = 360;

        const drawTotalRow = (label, value, shaded = false) => {
            if (shaded) doc.rect(totalBoxX, y, totalBoxW, rowH).fillAndStroke("#f0f0f0", "black");
            doc.fillColor("#000").font("Helvetica-Bold").fontSize(10);
            doc.text(label, totalBoxX + 10, y + 6, { width: 180, align: "right" });
            doc.text(`£${value.toFixed(2)}`, totalBoxX + 190, y + 6, { width: 150, align: "right" });
            doc.rect(totalBoxX, y, totalBoxW, rowH).stroke();
            y += rowH;
        };

        drawTotalRow("Total Revenue", totalRevenue, true);
        drawTotalRow("Net VAT (20%)", netVat, false);
        drawTotalRow("Net Profit", totalProfit, true);

        // ------------------ FOOTER ------------------
        const footerY = doc.page.height - 50;

        // 🔹 Line above footer
        doc.moveTo(40, footerY - 10)
            .lineTo(doc.page.width - 40, footerY - 10)
            .strokeColor("#999")
            .lineWidth(0.5)
            .stroke();

        // 🔹 Footer Text
        doc.fontSize(8)
            .fillColor("#555")
            .text(
                `Generated on: ${new Date().toLocaleDateString("en-GB")}  |  Confidential Internal Report`,
                40,
                footerY,
                { align: "center", width: doc.page.width - 80 }
            );

        doc.end();

    } catch (err) {
        console.error("❌ Error generating internal invoice PDF:", err);
        res.status(500).json({
            message: "Failed to generate internal invoice PDF",
            error: err.message
        });
    }
};
