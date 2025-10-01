// controllers/internalInvoiceController.js
import InternalInvoice from "../models/InternalInvoice.js";
import Invoice from "../models/Invoice.js";
import PurchaseInvoice from "../models/PurchaseInvoice.js";

/**
 * Create an internal invoice
 * Only requires invoiceId from frontend.
 */
export const createInternalInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.body;

        // fetch invoice
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });

        // fetch purchase invoice using booking from invoice
        const purchaseInvoice = await PurchaseInvoice.findOne({ booking: invoice.booking });
        if (!purchaseInvoice)
            return res.status(404).json({ message: "Purchase invoice not found for this booking" });

        const revenue = invoice.totalAmount || 0;
        const cost = purchaseInvoice.totalAmount || 0;
        const profit = revenue - cost;

        // create internal invoice
        const internalInvoice = new InternalInvoice({
            booking: invoice.booking,
            invoice: invoice._id,
            purchaseInvoice: purchaseInvoice._id,
            revenue,
            cost,
            profit,
            createdBy: req.user?._id,
        });

        await internalInvoice.save();
        res.status(201).json({
            message: "Internal invoice created successfully",
            data: internalInvoice,
        });
    } catch (err) {
        console.error("❌ Error creating internal invoice:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Get paginated internal invoices with optional filters
 */
export const getInternalInvoices = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const query = {};

        // fetch with population
        const records = await InternalInvoice.find(query)
            .populate("invoice")
            .populate({
                path: "purchaseInvoice",
                populate: {
                    path: "items.part",
                    select: "partName", // ✅ Only fetch partName
                },
            })
            .populate("booking")
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        const total = await InternalInvoice.countDocuments(query);

        // ✅ format response
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

            // from Purchase Invoice items
            inv.purchaseInvoice?.items?.forEach((i) => {
                items.push({
                    description: i.part?.partName || "N/A", // ✅ show part name
                    type: "Purchase",
                    quantity: i.quantity,
                    cost: i.rate || 0,
                    selling: 0,
                    vatIncluded: inv.purchaseInvoice?.vatIncluded,
                    total: i.rate * i.quantity,
                    status: inv.purchaseInvoice?.paymentStatus,
                });
            });

            return {
                _id: inv._id,
                booking: inv.booking,
                invoice: inv.invoice,
                purchaseInvoice: inv.purchaseInvoice,
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
 * ✅ Get Internal Invoice by ID (with partName populated)
 */
export const getInternalInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;

        const inv = await InternalInvoice.findById(id)
            .populate("invoice")
            .populate({
                path: "purchaseInvoice",
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

        inv.purchaseInvoice?.items?.forEach((i) => {
            items.push({
                description: i.part?.partName || "N/A",
                type: "Purchase",
                quantity: i.quantity,
                cost: i.rate || 0,
                selling: 0,
                vatIncluded: inv.purchaseInvoice?.vatIncluded,
                total: i.rate * i.quantity,
                status: inv.purchaseInvoice?.paymentStatus,
            });
        });

        res.json({
            data: {
                _id: inv._id,
                booking: inv.booking,
                invoice: inv.invoice,
                purchaseInvoice: inv.purchaseInvoice,
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