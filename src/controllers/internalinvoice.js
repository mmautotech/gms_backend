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
                if (invoice.vatIncluded) {
                    revenue += base + base * VAT_RATE;
                } else {
                    revenue += base;
                }
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
                if (pi.vatIncluded) {
                    cost += base + base * VAT_RATE;
                } else {
                    cost += base;
                }
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
        const { page = 1, limit = 10 } = req.query;

        const query = {};

        // fetch with population
        const records = await InternalInvoice.find(query)
            .populate("invoice")
            .populate({
                path: "purchaseInvoices",
                populate: {
                    path: "items.part",
                    select: "partName",
                },
            })
            .populate("booking")
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        const total = await InternalInvoice.countDocuments(query);

        // format response
        const data = records.map((inv) => {
            const items = [];

            // from Invoice items
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

            // from ALL Purchase Invoices
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
                populate: {
                    path: "items.part",
                    select: "partName",
                },
            })
            .populate("booking");

        if (!inv) {
            return res.status(404).json({ message: "Internal invoice not found" });
        }

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
