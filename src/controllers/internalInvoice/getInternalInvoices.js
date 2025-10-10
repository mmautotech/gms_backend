import InternalInvoice from "../../models/InternalInvoice.js";

/**
 * ✅ GET /api/internal-invoices
 * Fetch all internal invoices with filters, pagination, sorting, and totals.
 * Supports: Pagination, Search, Status (Partial / Receivable / Received / Cancelled),
 * Date range, Sorting, Totals summary.
 */
export const getInternalInvoices = async (req, res) => {
    try {
        // -----------------------------
        // 🧾 Extract Query Params
        // -----------------------------
        const {
            page = 1,
            limit = 25,
            search = "",
            status = "",
            fromDate = "",
            toDate = "",
            sortOn = "landingDate",
            sortOrder = "desc",
        } = req.query;

        const skip = (page - 1) * limit;

        // -----------------------------
        // ⚙️ Build Filters
        // -----------------------------
        const match = {};

        // Date range (createdAt)
        if (fromDate || toDate) {
            match.createdAt = {};
            if (fromDate) match.createdAt.$gte = new Date(fromDate);
            if (toDate) match.createdAt.$lte = new Date(toDate);
        }

        // -----------------------------
        // 🔍 Search Filter
        // -----------------------------
        const searchFilter = search
            ? {
                $or: [
                    { "invoice.invoiceNo": { $regex: search, $options: "i" } },
                    { "invoice.customerName": { $regex: search, $options: "i" } },
                    { "invoice.contactNo": { $regex: search, $options: "i" } },
                    { "booking.vehicleRegNo": { $regex: search, $options: "i" } },
                    { "booking.makeModel": { $regex: search, $options: "i" } },
                ],
            }
            : {};

        // -----------------------------
        // 🧮 Status Filter (Allowed only 4)
        // -----------------------------
        const allowedStatuses = ["Partial", "Receivable", "Received", "Cancelled"];
        let statusFilter = {};

        if (status) {
            const normalized = status.trim().toLowerCase();
            const matched = allowedStatuses.find(
                (s) => s.toLowerCase() === normalized
            );
            if (matched) {
                statusFilter = { "invoice.status": { $regex: `^${matched}$`, $options: "i" } };
            } else {
                // Invalid status — return no results
                return res.status(400).json({
                    success: false,
                    message: `Invalid status '${status}'. Allowed: ${allowedStatuses.join(", ")}`,
                });
            }
        }

        // -----------------------------
        // 🧱 Aggregation Pipeline
        // -----------------------------
        const pipeline = [
            {
                $lookup: {
                    from: "invoices",
                    localField: "invoice",
                    foreignField: "_id",
                    as: "invoice",
                },
            },
            { $unwind: "$invoice" },
            {
                $lookup: {
                    from: "bookings",
                    localField: "booking",
                    foreignField: "_id",
                    as: "booking",
                },
            },
            { $unwind: "$booking" },
            {
                $match: {
                    ...match,
                    ...searchFilter,
                    ...statusFilter,
                },
            },
            {
                $sort: {
                    [sortOn === "landingDate"
                        ? "invoice.landingDate"
                        : "invoice.createdAt"]: sortOrder === "asc" ? 1 : -1,
                },
            },
            {
                $project: {
                    _id: 1,
                    invoiceNo: "$invoice.invoiceNo",
                    landingDate: "$invoice.landingDate",
                    customerName: "$invoice.customerName",
                    vehicle: {
                        $concat: [
                            "$booking.vehicleRegNo",
                            " (",
                            "$booking.makeModel",
                            ")",
                        ],
                    },
                    status: {
                        $cond: [
                            { $ifNull: ["$invoice.status", false] },
                            "$invoice.status",
                            "Unknown",
                        ],
                    },
                    sales: 1,
                    purchases: 1,
                    netVat: 1,
                    calculatedProfit: {
                        $subtract: [
                            { $subtract: ["$sales", "$purchases"] },
                            "$netVat",
                        ],
                    },
                    createdAt: "$invoice.createdAt",
                },
            },
        ];

        // -----------------------------
        // 📊 Totals Calculation (Before Pagination)
        // -----------------------------
        const totalsPipeline = [
            ...pipeline,
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: "$sales" },
                    totalPurchases: { $sum: "$purchases" },
                    totalNetVat: { $sum: "$netVat" },
                    totalProfit: { $sum: "$calculatedProfit" },
                    count: { $sum: 1 },
                },
            },
        ];

        const totalsResult = await InternalInvoice.aggregate(totalsPipeline);
        const totals =
            totalsResult[0] || {
                totalSales: 0,
                totalPurchases: 0,
                totalNetVat: 0,
                totalProfit: 0,
                count: 0,
            };

        // -----------------------------
        // 📄 Paginated Data
        // -----------------------------
        const paginatedPipeline = [...pipeline, { $skip: skip }, { $limit: Number(limit) }];
        const invoices = await InternalInvoice.aggregate(paginatedPipeline);
        const totalCount = totals.count;
        const totalPages = Math.ceil(totalCount / limit);

        // -----------------------------
        // ✅ Final Response
        // -----------------------------
        res.status(200).json({
            success: true,
            pagination: {
                total: totalCount,
                page: Number(page),
                limit: Number(limit),
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
            totals: {
                totalSales: Number(totals.totalSales.toFixed(2)),
                totalPurchases: Number(totals.totalPurchases.toFixed(2)),
                totalNetVat: Number(totals.totalNetVat.toFixed(2)),
                totalProfit: Number(totals.totalProfit.toFixed(2)),
            },
            data: invoices,
        });
    } catch (err) {
        console.error("❌ Error fetching internal invoices:", err);
        res.status(500).json({
            success: false,
            message: "Server error while fetching internal invoices",
            error: err.message,
        });
    }
};
