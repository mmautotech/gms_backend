import path from "path";
import PDFDocument from "pdfkit";
import PurchaseInvoice from "../models/PurchaseInvoice.js";
import Supplier from "../models/Supplier.js";
import Part from "../models/Part.js";

/**
 * ✅ Create invoice (any authenticated user)
 */
export const createPurchaseInvoice = async (req, res) => {
    try {
        const { supplier, items } = req.body;

        // ensure supplier exists
        const supplierExists = await Supplier.findById(supplier);
        if (!supplierExists) {
            return res.status(400).json({ success: false, error: "Supplier not found" });
        }

        // ensure all parts exist
        const partIds = items.map((i) => i.part);
        const parts = await Part.find({ _id: { $in: partIds } });
        if (parts.length !== partIds.length) {
            return res.status(400).json({ success: false, error: "One or more parts not found" });
        }

        // create invoice with purchaser set
        const invoice = await PurchaseInvoice.create({
            ...req.body,
            purchaser: req.user._id,
        });

        res.status(201).json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * ✅ Get logged-in user's invoices (with filters + pagination + meta)
 */
export const getMyInvoices = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 50,
            status,
            supplier,
            part,
            partName,
            startDate,
            endDate,
            paymentDate,
            vatIncluded,
            minPrice,
            maxPrice,
            sortBy,
            sortOrder = "asc"
        } = req.query;

        page = Number(page) || 1;
        limit = Number(limit) || 50;
        const skip = (page - 1) * limit;

        const filter = { purchaser: req.user._id, isActive: true };
        if (status) filter.paymentStatus = status;
        if (supplier) filter.supplier = supplier;
        if (vatIncluded !== undefined) filter.vatIncluded = vatIncluded === "true";
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }
        if (paymentDate) filter.paymentDate = new Date(paymentDate);
        if (part) filter["items.part"] = part;

        // Filter by partName (case-insensitive)
        if (partName) {
            const parts = await Part.find({ partName: { $regex: partName, $options: "i" } });
            if (parts.length > 0) filter["items.part"] = { $in: parts.map(p => p._id) };
            else filter["items.part"] = null; // no match
        }

        const fieldMap = { price: "items.rate", invoiceDate: "createdAt", paymentDate: "paymentDate" };
        const sort = sortBy ? { [fieldMap[sortBy]]: sortOrder === "asc" ? 1 : -1 } : { createdAt: -1 };

        let invoicesQuery = PurchaseInvoice.find(filter)
            .populate("supplier", "name contact")
            .populate("items.part", "partName partNumber")
            .skip(skip)
            .limit(limit)
            .sort(sort)
            .lean();

        // Filter by price range
        if (minPrice || maxPrice) {
            const allInvoices = await PurchaseInvoice.find(filter).populate("items.part").lean();
            const filtered = allInvoices.filter(inv => {
                const total = inv.items.reduce((sum, i) => sum + Number(i.rate || 0) * (i.quantity || 1), 0);
                if (minPrice && total < Number(minPrice)) return false;
                if (maxPrice && total > Number(maxPrice)) return false;
                return true;
            });
            const total = filtered.length;
            const paginated = filtered.slice(skip, skip + limit);
            return res.json({
                success: true,
                data: paginated,
                meta: { total, page, pages: Math.ceil(total / limit), limit },
            });
        }

        const [invoices, total] = await Promise.all([
            invoicesQuery,
            PurchaseInvoice.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: invoices,
            meta: { total, page, pages: Math.ceil(total / limit), limit },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * ✅ Get invoice by ID (user → only their own, admin → all)
 */
export const getPurchaseInvoiceById = async (req, res) => {
    try {
        const filter = { _id: req.params.id, isActive: true };
        if (req.user.userType !== "admin") filter.purchaser = req.user._id;

        const invoice = await PurchaseInvoice.findOne(filter)
            .populate("supplier", "name contact")
            .populate("items.part", "partName partNumber")
            .populate("purchaser", "username userType")
            .lean();

        if (!invoice) return res.status(404).json({ success: false, error: "Invoice not found" });

        res.json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * ✅ Admin updates invoice
 */
export const updatePurchaseInvoice = async (req, res) => {
    try {
        const invoice = await PurchaseInvoice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate("supplier", "name contact")
            .populate("items.part", "partName partNumber");

        if (!invoice) return res.status(404).json({ success: false, error: "Invoice not found" });

        res.json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * ✅ User updates only their own invoice status
 */
export const updateMyInvoiceStatus = async (req, res) => {
    try {
        const invoice = await PurchaseInvoice.findOneAndUpdate(
            { _id: req.params.id, purchaser: req.user._id },
            { paymentStatus: req.body.paymentStatus },
            { new: true }
        );

        if (!invoice) return res.status(404).json({ success: false, error: "Invoice not found" });

        res.json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * ✅ Admin gets all invoices with pagination, filters & meta
 */
export const getAllInvoices = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 50,
            purchaser,
            supplier,
            part,
            partName,
            status,
            vatIncluded,
            startDate,
            endDate,
            paymentDate,
            minPrice,
            maxPrice,
            sortBy,
            sortOrder = "asc"
        } = req.query;

        page = Number(page) || 1;
        limit = Number(limit) || 50;
        const skip = (page - 1) * limit;

        const filter = { isActive: true };
        if (purchaser) filter.purchaser = purchaser;
        if (supplier) filter.supplier = supplier;
        if (status) filter.paymentStatus = status;
        if (vatIncluded !== undefined) filter.vatIncluded = vatIncluded === "true";
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }
        if (paymentDate) filter.paymentDate = new Date(paymentDate);
        if (part) filter["items.part"] = part;

        // Filter by partName
        if (partName) {
            const parts = await Part.find({ partName: { $regex: partName, $options: "i" } });
            if (parts.length > 0) filter["items.part"] = { $in: parts.map(p => p._id) };
            else filter["items.part"] = null;
        }

        const fieldMap = { price: "items.rate", invoiceDate: "createdAt", paymentDate: "paymentDate" };
        const sort = sortBy ? { [fieldMap[sortBy]]: sortOrder === "asc" ? 1 : -1 } : { createdAt: -1 };

        let invoicesQuery = PurchaseInvoice.find(filter)
            .populate("supplier", "name contact")
            .populate("items.part", "partName partNumber")
            .populate("purchaser", "username userType")
            .skip(skip)
            .limit(limit)
            .sort(sort)
            .lean();

        // Filter by price range
        if (minPrice || maxPrice) {
            const allInvoices = await PurchaseInvoice.find(filter).populate("items.part").lean();
            const filtered = allInvoices.filter(inv => {
                const total = inv.items.reduce((sum, i) => sum + Number(i.rate || 0) * (i.quantity || 1), 0);
                if (minPrice && total < Number(minPrice)) return false;
                if (maxPrice && total > Number(maxPrice)) return false;
                return true;
            });
            const total = filtered.length;
            const paginated = filtered.slice(skip, skip + limit);
            return res.json({
                success: true,
                data: paginated,
                meta: { total, page, pages: Math.ceil(total / limit), limit },
            });
        }

        const [invoices, total] = await Promise.all([
            invoicesQuery,
            PurchaseInvoice.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: invoices,
            meta: { total, page, pages: Math.ceil(total / limit), limit },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * ✅ Admin soft deletes invoice
 */
export const deletePurchaseInvoice = async (req, res) => {
    try {
        const invoice = await PurchaseInvoice.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });

        if (!invoice) return res.status(404).json({ success: false, error: "Invoice not found" });

        res.json({ success: true, message: "Invoice deactivated", data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * ✅ Download Purchase Invoice PDF
 * Query: ?proforma=true → PROFORMA INVOICE
 */
export const downloadPurchaseInvoicePdf = async (req, res) => {
    try {
        const { id } = req.params;
        const isProforma = req.query.proforma === "true";

        const invoice = await PurchaseInvoice.findById(id)
            .populate("supplier", "name contact")
            .populate("items.part", "partName partNumber")
            .populate("purchaser", "username userType")
            .lean();

        if (!invoice) {
            return res.status(404).json({ success: false, error: "Invoice not found" });
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=${invoice.invoiceNo || invoice.vendorInvoiceNumber || "invoice"}.pdf`
        );

        const doc = new PDFDocument({ margin: 40 });
        doc.pipe(res);

        // Header
        doc.font("Helvetica-Bold").fontSize(14).text("PERIVALE MOTOR SERVICES 1", { align: "center" });
        doc.font("Helvetica").fontSize(10)
            .text("67 Bideford Ave, Perivale, Greenford UB6 7PP, United Kingdom", { align: "center" })
            .text("Phone: +44 7907 070780", { align: "center" });
        if (invoice.vatIncluded) doc.text("VAT No: 488627727", { align: "center" });
        doc.moveDown(1);

        doc.font("Helvetica-Bold").fontSize(12).text(isProforma ? "PROFORMA INVOICE" : "PURCHASE INVOICE", { align: "center" });
        doc.moveDown(0.5);

        const startX = 40, tableWidth = 520, rowH = 20;
        let y = doc.y + 5;

        const drawCell = (text, x, y, w, h, align = "left", bold = false) => {
            doc.rect(x, y, w, h).stroke();
            doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10).text(text || "", x + 4, y + 6, { width: w - 8, align });
        };

        drawCell("INVOICE #", startX, y, 130, rowH, "left", true);
        drawCell(invoice.invoiceNo || invoice.vendorInvoiceNumber || "—", startX + 130, y, 130, rowH);
        drawCell("Invoice Date", startX + 260, y, 130, rowH, "left", true);
        drawCell(invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-GB") : "—", startX + 390, y, 170, rowH);
        y += rowH;

        drawCell("Supplier", startX, y, 130, rowH, true);
        drawCell(invoice.supplier?.name || "—", startX + 130, y, 130, rowH);
        drawCell("Contact #", startX + 260, y, 130, rowH, true);
        drawCell(invoice.supplier?.contact || "—", startX + 390, y, 170, rowH);
        y += rowH + 10;

        // Items table
        const items = Array.isArray(invoice.items) ? invoice.items : [];
        const MIN_ROWS = 5;
        drawCell("Description", startX, y, 300, rowH, "left", true);
        drawCell("Qty", startX + 300, y, 100, rowH, "center", true);
        drawCell("Amount", startX + 400, y, 160, rowH, "right", true);
        y += rowH;

        for (let i = 0; i < Math.max(items.length, MIN_ROWS); i++) {
            const item = items[i] || {};
            drawCell(item.part?.partName || "", startX, y, 300, rowH);
            drawCell(item.quantity || 1, startX + 300, y, 100, rowH, "center");
            drawCell(item.rate != null ? `£${Number(item.rate).toFixed(2)}` : "", startX + 400, y, 160, rowH, "right");
            y += rowH;
        }
        y += 10;

        // Totals
        const subtotal = items.reduce((sum, i) => sum + Number(i.rate || 0) * (i.quantity || 1), 0);
        const discount = Number(invoice.discountAmount || 0);
        const vat = invoice.vatIncluded ? (subtotal - discount) * 0.2 : 0;
        const total = subtotal - discount + vat;

        drawCell("Subtotal", startX + 300, y, 100, rowH, "right", true);
        drawCell(`£${subtotal.toFixed(2)}`, startX + 400, y, 160, rowH, "right");
        y += rowH;

        drawCell("Discount", startX + 300, y, 100, rowH, "right", true);
        drawCell(`-£${discount.toFixed(2)}`, startX + 400, y, 160, rowH, "right");
        y += rowH;

        if (invoice.vatIncluded) {
            drawCell("INCLUDING VAT", startX + 300, y, 100, rowH, "right", true);
            drawCell(`£${vat.toFixed(2)}`, startX + 400, y, 160, rowH, "right");
            y += rowH;
        }

        drawCell("Total", startX + 300, y, 100, rowH, "right", true);
        drawCell(`£${total.toFixed(2)}`, startX + 400, y, 160, rowH, "right", true);
        y += rowH + 20;

        // Footer
        y += 80;
        doc.font("Helvetica").fontSize(8)
            .text("Please check all parts and services. Contact support for any issues.", startX, y, { width: tableWidth, align: "justify" })
            .moveDown(0.5)
            .text("Bank Details: Perivale Motor Services1 LTD, Sort Code: 30-54-66, Account No: 32006468", { width: tableWidth, align: "justify" })
            .moveDown(1)
            .text("Authorized Signature: ___________________", { align: "left" });

        doc.end();

    } catch (err) {
        console.error("Error generating PDF:", err);
        const doc = new PDFDocument();
        res.setHeader("Content-Type", "application/pdf");
        doc.pipe(res);
        doc.text("Failed to generate invoice PDF. Please try again later.");
        doc.end();
    }
};
