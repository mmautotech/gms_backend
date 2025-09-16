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
        const {
            page = 1,
            limit = 50,
            status,
            supplier,
            part,
            partNumber,
            startDate,
            endDate,
            paymentDate,
            vatIncluded,
            sortBy,
            sortOrder = "asc",
        } = req.query;

        const filter = { purchaser: req.user._id, isActive: true };

        if (status) filter.paymentStatus = status;
        if (supplier) filter.supplier = supplier;
        if (vatIncluded !== undefined) filter.vatIncluded = vatIncluded;

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }
        if (paymentDate) filter.paymentDate = new Date(paymentDate);

        if (part || partNumber) {
            filter["items.part"] = part;
            if (partNumber) {
                // join with parts collection
                const partMatch = await Part.findOne({ partNumber: partNumber });
                if (partMatch) filter["items.part"] = partMatch._id;
            }
        }

        // sorting
        let sort = { createdAt: -1 };
        if (sortBy) {
            const fieldMap = {
                price: "items.rate",
                invoiceDate: "createdAt",
                paymentDate: "paymentDate",
            };
            sort = { [fieldMap[sortBy]]: sortOrder === "asc" ? 1 : -1 };
        }

        const skip = (page - 1) * limit;

        const [invoices, total] = await Promise.all([
            PurchaseInvoice.find(filter)
                .populate("supplier", "name contact")
                .populate("items.part", "partName partNumber")
                .skip(skip)
                .limit(limit)
                .sort(sort)
                .lean(),
            PurchaseInvoice.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: invoices,
            meta: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit),
                limit: Number(limit),
            },
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

        if (!invoice) {
            return res.status(404).json({ success: false, error: "Invoice not found" });
        }

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
        const invoice = await PurchaseInvoice.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        })
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
        const {
            page = 1,
            limit = 50,
            purchaser,
            supplier,
            part,
            partNumber,
            status,
            vatIncluded,
            startDate,
            endDate,
            paymentDate,
            sortBy,
            sortOrder = "asc",
        } = req.query;

        const filter = { isActive: true };

        if (purchaser) filter.purchaser = purchaser;
        if (supplier) filter.supplier = supplier;
        if (status) filter.paymentStatus = status;
        if (vatIncluded !== undefined) filter.vatIncluded = vatIncluded;

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }
        if (paymentDate) filter.paymentDate = new Date(paymentDate);

        if (part || partNumber) {
            filter["items.part"] = part;
            if (partNumber) {
                const partMatch = await Part.findOne({ partNumber: partNumber });
                if (partMatch) filter["items.part"] = partMatch._id;
            }
        }

        let sort = { createdAt: -1 };
        if (sortBy) {
            const fieldMap = {
                price: "items.rate",
                invoiceDate: "createdAt",
                paymentDate: "paymentDate",
            };
            sort = { [fieldMap[sortBy]]: sortOrder === "asc" ? 1 : -1 };
        }

        const skip = (page - 1) * limit;

        const [invoices, total] = await Promise.all([
            PurchaseInvoice.find(filter)
                .populate("supplier", "name contact")
                .populate("items.part", "partName partNumber")
                .populate("purchaser", "username userType")
                .skip(skip)
                .limit(limit)
                .sort(sort)
                .lean(),
            PurchaseInvoice.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: invoices,
            meta: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit),
                limit: Number(limit),
            },
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
        const invoice = await PurchaseInvoice.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!invoice) return res.status(404).json({ success: false, error: "Invoice not found" });

        res.json({ success: true, message: "Invoice deactivated", data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
