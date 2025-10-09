import InternalInvoice from "../../models/InternalInvoice.js";

/**
 * ✅ Aggregated Internal Invoice Listing (Paginated + Search + Filters + Totals)
 * Profit = Sales - Purchases - NetVat
 */
export const getInternalInvoices = async (req, res) => {
    try {
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

        // -----------------------------
        // ⚙️ Safe Pagination + Sorting Setup
        // -----------------------------
        const allowedLimits = [5, 25, 50, 100];
        const safeLimit = allowedLimits.includes(Number(limit))
            ? Number(limit)
            : 25;
        const safePage = Math.max(Number(page) || 1, 1);
        const skip = (safePage - 1) * safeLimit;

        const sortDirection = sortOrder === "asc" ? 1 : -1;
        const sortField =
            sortOn === "createDate" ? "createdAt" : "booking.arrivedAt";

        // -----------------------------
        // 🔎 Match Filters
        // -----------------------------
        const match = [];

        if (search?.trim()) {
            const term = search.trim();
            match.push({
                $or: [
                    { "booking.vehicleRegNo": { $regex: term, $options: "i" } },
                    { "booking.makeModel": { $regex: term, $options: "i" } },
                    { "invoice.invoiceNo": { $regex: term, $options: "i" } },
                    { "invoice.customerName": { $regex: term, $options: "i" } },
                ],
            });
        }

        if (status?.trim()) {
            match.push({
                "invoice.status": { $regex: `^${status}$`, $options: "i" },
            });
        }

        if (fromDate || toDate) {
            const from = fromDate ? new Date(fromDate) : null;
            const to = toDate ? new Date(toDate) : null;
            if (to) to.setHours(23, 59, 59, 999);

            match.push({
                [sortOn === "createDate" ? "createdAt" : "booking.arrivedAt"]: {
                    ...(from && { $gte: from }),
                    ...(to && { $lte: to }),
                },
            });
        }

        const matchStage = match.length ? { $and: match } : {};

        // -----------------------------
        // 🧮 Aggregation Pipeline
        // -----------------------------
        const pipeline = [
            // Lookup booking
            {
                $lookup: {
                    from: "bookings",
                    localField: "booking",
                    foreignField: "_id",
                    as: "booking",
                },
            },
            { $unwind: "$booking" },

            // Lookup invoice
            {
                $lookup: {
                    from: "invoices",
                    localField: "invoice",
                    foreignField: "_id",
                    as: "invoice",
                },
            },
            { $unwind: "$invoice" },

            // Apply filters
            { $match: matchStage },

            // Sort early
            { $sort: { [sortField]: sortDirection } },

            // Derived fields
            {
                $addFields: {
                    vehicle: {
                        $concat: [
                            { $ifNull: ["$booking.vehicleRegNo", "N/A"] },
                            " (",
                            { $ifNull: ["$booking.makeModel", "N/A"] },
                            ")",
                        ],
                    },
                    invoiceNo: "$invoice.invoiceNo",
                    customerName: "$invoice.customerName",
                    status: "$invoice.status",
                    landingDate: "$booking.arrivedAt",
                    calculatedProfit: {
                        $subtract: [
                            { $subtract: ["$sales", "$purchases"] },
                            { $ifNull: ["$netVat", 0] },
                        ],
                    },
                },
            },

            {
                $project: {
                    _id: 1,
                    invoiceNo: 1,
                    customerName: 1,
                    status: 1,
                    vehicle: 1,
                    sales: 1,
                    purchases: 1,
                    netVat: 1,
                    calculatedProfit: 1,
                    landingDate: 1,
                    createdAt: 1,
                },
            },

            // Parallel aggregation
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    totals: [
                        {
                            $group: {
                                _id: null,
                                totalSales: { $sum: "$sales" },
                                totalPurchases: { $sum: "$purchases" },
                                totalNetVat: {
                                    $sum: { $ifNull: ["$netVat", 0] },
                                },
                                totalProfit: {
                                    $sum: {
                                        $subtract: [
                                            { $subtract: ["$sales", "$purchases"] },
                                            { $ifNull: ["$netVat", 0] },
                                        ],
                                    },
                                },
                            },
                        },
                    ],
                    data: [{ $skip: skip }, { $limit: safeLimit }],
                },
            },
        ];

        const result = await InternalInvoice.aggregate(pipeline, {
            allowDiskUse: true,
        });

        // -----------------------------
        // 📊 Format Response
        // -----------------------------
        const data = result[0]?.data || [];
        const totalInvoices = result[0]?.metadata[0]?.total || 0;
        const totalPages = Math.ceil(totalInvoices / safeLimit) || 1;

        const totals = result[0]?.totals[0] || {
            totalSales: 0,
            totalPurchases: 0,
            totalNetVat: 0,
            totalProfit: 0,
        };

        const pagination = {
            total: totalInvoices,
            page: safePage,
            limit: safeLimit,
            totalPages,
            hasNextPage: safePage < totalPages,
            hasPrevPage: safePage > 1,
        };

        // Backend execution parameters (internal)
        const params = {
            sortBy: sortOn === "createDate" ? "createdDate" : "landingDate",
            sortDir: sortOrder,
            perPage: safeLimit,
            page: safePage,
        };

        // Applied user filters (for UI)
        const appliedFilters = {
            search: search || null,
            status: status || null,
            fromDate: fromDate || null,
            toDate: toDate || null,
            sortOn,
            sortOrder,
        };

        // -----------------------------
        // ✅ Response
        // -----------------------------
        return res.status(200).json({
            success: true,
            params, // backend pagination & sort info
            appliedFilters, // UI-visible filter state
            pagination,
            totals: {
                totalSales: Number(totals.totalSales?.toFixed(2)) || 0,
                totalPurchases: Number(totals.totalPurchases?.toFixed(2)) || 0,
                totalNetVat: Number(totals.totalNetVat?.toFixed(2)) || 0,
                totalProfit: Number(totals.totalProfit?.toFixed(2)) || 0,
            },
            data,
        });
    } catch (err) {
        console.error("❌ Error fetching internal invoices:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};

/**
 * 🧩 Recommended Indexes (run once in Mongo shell)
 *
 * db.internalinvoices.createIndex({ "booking.arrivedAt": -1 });
 * db.internalinvoices.createIndex({ createdAt: -1 });
 * db.internalinvoices.createIndex({ "invoice.invoiceNo": 1 });
 * db.internalinvoices.createIndex({ "booking.vehicleRegNo": 1 });
 */
