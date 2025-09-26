// src/controllers/internalinvoice.js
import Invoice from "../models/Invoice.js";
import PurchaseInvoice from "../models/PurchaseInvoice.js";
import InternalInvoice from "../models/InternalInvoice.js";

// -----------------------------
// 🧾 Get All Internal Invoices
// -----------------------------
export const getAllInternalInvoices = async (req, res) => {
    try {
        let { page = 1, limit = 20, search, fromDate, toDate } = req.query;
        page = parseInt(page, 10);
        limit = parseInt(limit, 10);
        const skip = (page - 1) * limit;

        const filter = {};

        if (search) {
            const regex = new RegExp(search, "i");
            filter.$or = [
                { vehicleRegNo: regex },
                { "items.description": regex },
            ];
        }

        if (fromDate || toDate) {
            filter.invoiceDate = {};
            if (fromDate) filter.invoiceDate.$gte = new Date(fromDate);
            if (toDate) {
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999);
                filter.invoiceDate.$lte = to;
            }
        }

        const totalInvoices = await InternalInvoice.countDocuments(filter);
        const invoices = await InternalInvoice.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("customerInvoice", "invoiceNo totalAmount vatIncluded")
            .populate("partsPurchaseInvoices", "vendorInvoiceNumber totalAmount vatIncluded")
            .lean();

        // Ensure VAT totals at invoice level
        const invoicesWithVAT = invoices.map((inv) => {
            const vatTotal = inv.items?.reduce(
                (sum, i) => sum + ((i.vatIncluded ? i.totalPrice * 0.2 : 0) || 0),
                0
            );
            return {
                ...inv,
                vatTotal,
                vatIncluded: vatTotal > 0,
            };
        });

        const invoicesWithRowNumber = invoicesWithVAT.map((inv, idx) => ({
            ...inv,
            rowNumber: skip + idx + 1,
        }));

        res.status(200).json({
            data: invoicesWithRowNumber,
            pagination: {
                total: totalInvoices,
                page,
                limit,
                totalPages: Math.ceil(totalInvoices / limit),
                hasNextPage: page * limit < totalInvoices,
                hasPrevPage: page > 1,
            },
        });
    } catch (err) {
        console.error("Error fetching internal invoices:", err);
        res.status(500).json({ message: "Failed to get internal invoices", error: err.message });
    }
};

// -----------------------------
// 🧾 Get Internal Invoice by ID
// -----------------------------
export const getInternalInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: "Invoice ID is required" });

        const invoice = await InternalInvoice.findById(id)
            .populate("customerInvoice")
            .populate("partsPurchaseInvoices")
            .lean();

        if (!invoice) return res.status(404).json({ message: "Internal invoice not found" });

        // Compute VAT totals
        const vatTotal = invoice.items?.reduce(
            (sum, i) => sum + ((i.vatIncluded ? i.totalPrice * 0.2 : 0) || 0),
            0
        );
        invoice.vatTotal = vatTotal;
        invoice.vatIncluded = vatTotal > 0;

        res.status(200).json(invoice);
    } catch (err) {
        console.error("Error fetching internal invoice:", err);
        res.status(500).json({ message: "Failed to get internal invoice", error: err.message });
    }
};

// -----------------------------
// 🧾 Delete Internal Invoice
// -----------------------------
export const deleteInternalInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await InternalInvoice.findByIdAndDelete(id);
        if (!invoice) {
            return res.status(404).json({ success: false, error: "Internal invoice not found" });
        }

        res.json({ success: true, message: "Internal invoice deleted", data: invoice });
    } catch (err) {
        console.error("Error deleting internal invoice:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// -----------------------------
// 🧾 Generate Internal Invoice
// -----------------------------
export const generateInternalInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.body;

        if (!invoiceId) {
            return res.status(400).json({ message: "Main Invoice ID is required" });
        }

        // Get main invoice (customer invoice)
        const mainInvoice = await Invoice.findById(invoiceId);
        if (!mainInvoice) {
            return res.status(404).json({ message: "Main invoice not found" });
        }

        // Prevent duplicate
        const existingInternal = await InternalInvoice.findOne({
            customerInvoice: mainInvoice._id,
        });
        if (existingInternal) {
            return res.status(400).json({ message: "Internal invoice already exists for this booking" });
        }

        const vatIncluded = !!mainInvoice.vatIncluded; // ensure boolean

        // --- Step 1: Service items ---
        const serviceItems = (mainInvoice.items || []).map((i) => {
            const vatAmount = vatIncluded ? i.amount * 0.2 : 0;
            return {
                description: i.description,
                invoiceType: "service",
                invoiceRef: mainInvoice._id,
                quantity: 1,
                costPrice: 0,
                sellingPrice: i.amount,
                totalPrice: i.amount + vatAmount,
                paymentStatus: "Paid",
                vatIncluded,
                vatAmount,
            };
        });

        // --- Step 2: Parts items ---
        let purchaseInvoices = [];
        if (mainInvoice.booking) {
            purchaseInvoices = await PurchaseInvoice.find({ booking: mainInvoice.booking });
        }
        if (purchaseInvoices.length === 0) {
            purchaseInvoices = await PurchaseInvoice.find({ vehicleRegNo: mainInvoice.vehicleRegNo });
        }

        const partItems = [];
        purchaseInvoices.forEach((pi) => {
            const piVatIncluded = !!pi.vatIncluded;
            (pi.items || []).forEach((p) => {
                const itemTotal = (p.rate || 0) * (p.quantity || 1);
                const vatAmount = piVatIncluded ? itemTotal * 0.2 : 0;
                partItems.push({
                    description: p.partName,
                    invoiceType: "part",
                    quantity: p.quantity || 1,
                    costPrice: p.rate || 0,
                    sellingPrice: 0,
                    totalPrice: itemTotal + vatAmount,
                    paymentStatus: pi.paymentStatus || "Pending",
                    vatIncluded: piVatIncluded,
                    vatAmount,
                    vendorInvoiceNumber: pi.vendorInvoiceNumber,
                    partsPurchaseRef: pi._id,
                });
            });
        });

        // --- Step 3: Combine & totals ---
        const allItems = [...serviceItems, ...partItems];
        const totalCost = partItems.reduce((sum, i) => sum + i.totalPrice, 0);
        const totalRevenue = serviceItems.reduce((sum, i) => sum + i.totalPrice, 0);
        const profit = totalRevenue - totalCost;

        // Compute invoice-level VAT
        const vatTotal = allItems.reduce(
            (sum, i) => sum + ((i.vatIncluded ? i.totalPrice * 0.2 : 0) || 0),
            0
        );
        const invoiceVatIncluded = vatTotal > 0;

        const internalInvoice = await InternalInvoice.create({
            vehicleRegNo: mainInvoice.vehicleRegNo,
            booking: mainInvoice.booking,
            items: allItems,
            totalCost,
            totalRevenue,
            profit,
            vatTotal,
            vatIncluded: invoiceVatIncluded,
            customerInvoice: mainInvoice._id,
            partsPurchaseInvoices: purchaseInvoices.map((pi) => pi._id),
        });

        res.status(201).json({
            message: "Internal invoice created successfully",
            data: internalInvoice,
        });
    } catch (err) {
        console.error("Error generating internal invoice:", err);
        res.status(500).json({ message: "Failed to generate internal invoice", error: err.message });
    }
};