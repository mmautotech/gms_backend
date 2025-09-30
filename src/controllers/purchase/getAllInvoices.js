import mongoose from "mongoose";
import PurchaseInvoice from "../../models/PurchaseInvoice.js";

const POPULATE_CONFIG = [
    { path: "supplier", select: "id name contact" },
    { path: "booking", select: "id vehicleRegNo status scheduledDate" },
    { path: "purchaser", select: "id username" },
    { path: "items.part", select: "id partName partNumber price" },
];

export const getAllInvoices = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 25,
            sortBy = "createdAt",
            sortOrder = "desc",
            supplier,
            purchaser,
            paymentStatus,
            vendorInvoiceNumber,
            fromDate,
            toDate,
            search,
            part,
        } = req.query;

        limit = Number(limit);
        page = Number(page);
        const skip = (page - 1) * limit;

        const SORT_FIELD_MAP = { createdAt: "createdAt", updatedAt: "updatedAt", paymentDate: "paymentDate" };
        const dbSortField = SORT_FIELD_MAP[sortBy] ?? "createdAt";
        const sortDir = sortOrder.toLowerCase() === "asc" ? 1 : -1;

        const filter = { isActive: true };
        if (supplier) filter.supplier = supplier;
        if (purchaser) filter.purchaser = purchaser;
        if (paymentStatus) filter.paymentStatus = paymentStatus;
        if (vendorInvoiceNumber) filter.vendorInvoiceNumber = { $regex: vendorInvoiceNumber, $options: "i" };
        if (fromDate || toDate) {
            filter.paymentDate = {};
            if (fromDate) filter.paymentDate.$gte = new Date(fromDate);
            if (toDate) {
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999);
                filter.paymentDate.$lte = to;
            }
        }
        if (part && mongoose.isValidObjectId(part)) filter["items.part"] = part;
        if (search) {
            const regex = new RegExp(search, "i");
            filter.$or = [
                { vendorInvoiceNumber: regex },
                { "booking.vehicleRegNo": regex },
            ];
        }

        const total = await PurchaseInvoice.countDocuments(filter);
        const invoices = await PurchaseInvoice.find(filter)
            .populate(POPULATE_CONFIG)
            .sort({ [dbSortField]: sortDir, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean({ virtuals: true });

        res.json({
            success: true,
            params: {
                sortBy,
                sortDir: sortOrder.toLowerCase(),
                perPage: limit,
                page,
            },
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
                hasPrevPage: page > 1,
            },
            data: invoices.map((inv, idx) => ({
                ...inv,
                rowNumber: skip + idx + 1,
            })),
        });
    } catch (err) {
        console.error("Get All Invoices Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
