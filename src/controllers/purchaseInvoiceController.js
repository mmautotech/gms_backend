import PurchaseInvoice from "../models/PurchaseInvoice.js";
import Supplier from "../models/Supplier.js";
import Booking from "../models/Booking.js"; // <-- ADD THIS

/**
 * Create a new purchase invoice
 */
export const createPurchaseInvoice = async (req, res) => {
    try {
        let { supplier, items, vehicleRegNo, paymentDate, discount, vatIncluded, vendorInvoiceNumber } = req.body;

        // ensure supplier exists
        const supplierExists = await Supplier.findById(supplier);
        if (!supplierExists) {
            return res.status(400).json({ success: false, error: "Supplier not found" });
        }

        // Validate items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: "Invoice must have at least one item" });
        }
        for (let i = 0; i < items.length; i++) {
            const { partName, rate, quantity } = items[i];
            if (!partName || rate == null || quantity == null) {
                return res.status(400).json({ success: false, error: `Item at index ${i} is invalid` });
            }
        }

        // Find matching booking by vehicleRegNo
        // Find matching booking by vehicleRegNo AND status arrived
        const bookingMatch = await Booking.findOne({ vehicleRegNo, status: "arrived" });
        const bookingId = bookingMatch ? bookingMatch._id : null;


        const invoice = await PurchaseInvoice.create({
            purchaser: req.user._id,
            supplier,
            items,
            vehicleRegNo,
            booking: bookingId, // <-- automatically reference booking
            paymentDate,
            discount: discount || 0,
            vatIncluded: vatIncluded || false,
            vendorInvoiceNumber: vendorInvoiceNumber || "",
        });

        res.status(201).json({ success: true, data: invoice });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Get logged-in user's invoices
 */
export const getMyInvoices = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, supplier, paymentStatus, vendorInvoiceNumber, fromDate, toDate } = req.query;
        const query = { purchaser: req.user._id, isActive: true };

        // Filters
        if (supplier) query.supplier = supplier;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (vendorInvoiceNumber) query.vendorInvoiceNumber = { $regex: vendorInvoiceNumber, $options: "i" };
        if (fromDate || toDate) query.paymentDate = {};
        if (fromDate) query.paymentDate.$gte = new Date(fromDate);
        if (toDate) query.paymentDate.$lte = new Date(toDate);

        // Search by vehicleRegNo or part name
        if (search) {
            query.$or = [
                { vehicleRegNo: { $regex: search, $options: "i" } },
                { items: { $elemMatch: { partName: { $regex: search, $options: "i" } } } }
            ];
        }

        const total = await PurchaseInvoice.countDocuments(query);
        const invoices = await PurchaseInvoice.find(query)
            .populate("supplier", "name contact")
            .populate("booking")
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .lean();

        res.json({ success: true, data: invoices, meta: { page: Number(page), pages: Math.ceil(total / limit), total } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Get invoice by ID
 */
export const getPurchaseInvoiceById = async (req, res) => {
    try {
        const filter = { _id: req.params.id, isActive: true };
        if (req.user.userType !== "admin") filter.purchaser = req.user._id;

        const invoice = await PurchaseInvoice.findOne(filter)
            .populate("supplier", "name contact")
            .populate("purchaser", "username userType")
            .populate("booking") // populate booking
            .lean();

        if (!invoice) return res.status(404).json({ success: false, error: "Invoice not found" });

        res.json({ success: true, data: invoice });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Update invoice (admin only)
 */
export const updatePurchaseInvoice = async (req, res) => {
    try {
        let { vehicleRegNo } = req.body;

        // Find booking based on updated vehicleRegNo
        let bookingId = null;
        if (vehicleRegNo) {
            const bookingMatch = await Booking.findOne({ vehicleRegNo, isActive: true });
            bookingId = bookingMatch ? bookingMatch._id : null;
        }

        const invoice = await PurchaseInvoice.findByIdAndUpdate(
            req.params.id,
            { ...req.body, booking: bookingId },
            { new: true, runValidators: true }
        )
            .populate("supplier", "name contact")
            .populate("booking");

        if (!invoice) return res.status(404).json({ success: false, error: "Invoice not found" });

        res.json({ success: true, data: invoice });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Delete (soft) invoice (admin only)
 */
export const deletePurchaseInvoice = async (req, res) => {
    try {
        const invoice = await PurchaseInvoice.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!invoice) return res.status(404).json({ success: false, error: "Invoice not found" });

        res.json({ success: true, message: "Invoice deactivated", data: invoice });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Update invoice payment status (user only)
 */
export const updateMyInvoiceStatus = async (req, res) => {
    try {
        const invoice = await PurchaseInvoice.findOneAndUpdate(
            { _id: req.params.id, purchaser: req.user._id },
            { paymentStatus: req.body.paymentStatus },
            { new: true }
        ).populate("booking");

        if (!invoice) return res.status(404).json({ success: false, error: "Invoice not found" });

        res.json({ success: true, data: invoice });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Get all invoices (admin only)
 */
export const getAllInvoices = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, supplier, purchaser, paymentStatus, vendorInvoiceNumber, fromDate, toDate } = req.query;
        const query = { isActive: true };

        if (supplier) query.supplier = supplier;
        if (purchaser) query.purchaser = { $regex: purchaser, $options: "i" };
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (vendorInvoiceNumber) query.vendorInvoiceNumber = { $regex: vendorInvoiceNumber, $options: "i" };
        if (fromDate || toDate) query.paymentDate = {};
        if (fromDate) query.paymentDate.$gte = new Date(fromDate);
        if (toDate) query.paymentDate.$lte = new Date(toDate);

        if (search) {
            query.$or = [
                { vehicleRegNo: { $regex: search, $options: "i" } },
                { items: { $elemMatch: { partName: { $regex: search, $options: "i" } } } }
            ];
        }

        const total = await PurchaseInvoice.countDocuments(query);
        const invoices = await PurchaseInvoice.find(query)
            .populate("supplier", "name contact")
            .populate("purchaser", "username userType")
            .populate("booking")
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .lean();

        res.json({ success: true, data: invoices, meta: { page: Number(page), pages: Math.ceil(total / limit), total } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
};