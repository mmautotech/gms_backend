import Invoice from "../../models/Invoice.js";

/**
 * 🧾 Get All Invoices (with filters, pagination, totals, and metadata)
 * Supports:
 * - Text search (invoiceNo, customerName, contactNo, postalCode, vehicleRegNo, makeModel)
 * - Status filter
 * - Date range filter (createdAt or landingDate depending on sortOn)
 * - ASC/DESC sorting
 * - Paginated + aggregated totals
 */
export const getAllInvoices = async (req, res) => {
    try {
        // -----------------------------
        // ⚙️ Query Parameters
        // -----------------------------
        let {
            page = 1,
            limit = 10,
            search = "",
            status = "",
            fromDate = "",
            toDate = "",
            sortOn = "createdAt", // default: createdAt
            sortOrder = "desc",   // default: descending
        } = req.query;

        // ✅ Defensive pagination setup
        const safePage = Math.max(Number(page) || 1, 1);
        const allowedLimits = [10, 25, 50, 100];
        const safeLimit = allowedLimits.includes(Number(limit))
            ? Number(limit)
            : 10;
        const skip = (safePage - 1) * safeLimit;

        // ✅ Sorting
        const sortDirection = sortOrder === "asc" ? 1 : -1;
        const sortField = ["invoiceNo", "createdAt", "landingDate"].includes(sortOn)
            ? sortOn
            : "createdAt";

        // -----------------------------
        // 🔍 Build Filters
        // -----------------------------
        const filter = {};

        // 🔹 Search filter
        if (search?.trim()) {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [
                { invoiceNo: regex },
                { customerName: regex },
                { contactNo: regex },
                { postalCode: regex },
                { vehicleRegNo: regex },
                { makeModel: regex },
            ];
        }

        // 🔹 Status filter
        if (status?.trim()) {
            filter.status = { $regex: `^${status}$`, $options: "i" };
        }

        // 🔹 Date range filter (works on createdAt or landingDate)
        if (fromDate || toDate) {
            const dateRange = {};
            if (fromDate) dateRange.$gte = new Date(fromDate);
            if (toDate) {
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999);
                dateRange.$lte = to;
            }
            filter[sortField] = dateRange;
        }

        // -----------------------------
        // 📊 Aggregated Totals (Fast)
        // -----------------------------
        const totalsAgg = await Invoice.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalInvoices: { $sum: 1 },
                    totalAmount: { $sum: "$totalAmount" },
                    totalDiscount: { $sum: "$discountAmount" },
                    received: {
                        $sum: {
                            $cond: [
                                { $eq: [{ $toLower: "$status" }, "received"] },
                                1,
                                0,
                            ],
                        },
                    },
                    receivable: {
                        $sum: {
                            $cond: [
                                { $eq: [{ $toLower: "$status" }, "receivable"] },
                                1,
                                0,
                            ],
                        },
                    },
                    partial: {
                        $sum: {
                            $cond: [
                                { $eq: [{ $toLower: "$status" }, "partial"] },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
        ]);

        const totals = totalsAgg[0] || {
            totalInvoices: 0,
            totalAmount: 0,
            totalDiscount: 0,
            received: 0,
            receivable: 0,
            partial: 0,
        };

        // -----------------------------
        // 🧾 Paginated Invoices (with username populated)
        // -----------------------------
        const invoicesRaw = await Invoice.find(filter)
            .populate("createdBy", "username userType") // ✅ populate username
            .sort({ [sortField]: sortDirection })
            .skip(skip)
            .limit(safeLimit)
            .select(
                "invoiceNo booking customerName contactNo postalCode vehicleRegNo makeModel landingDate totalAmount discountAmount vatIncluded status createdBy createdAt updatedAt"
            )
            .lean();

        // ✅ Flatten createdBy field
        const invoices = invoicesRaw.map((inv) => ({
            ...inv,
            createdBy:
                typeof inv.createdBy === "object"
                    ? inv.createdBy?.username || "N/A"
                    : inv.createdBy || "N/A",
        }));

        // -----------------------------
        // 📦 Pagination Metadata
        // -----------------------------
        const totalPages = Math.ceil(totals.totalInvoices / safeLimit) || 1;
        const pagination = {
            total: totals.totalInvoices,
            page: safePage,
            limit: safeLimit,
            totalPages,
            hasNextPage: safePage < totalPages,
            hasPrevPage: safePage > 1,
        };

        // -----------------------------
        // 🧮 Query Params Summary
        // -----------------------------
        const params = {
            sortBy: sortOn,
            sortDir: sortOrder,
            perPage: safeLimit,
            page: safePage,
        };

        const appliedFilters = {
            search: search || null,
            status: status || null,
            fromDate: fromDate || null,
            toDate: toDate || null,
            sortOn,
            sortOrder,
        };

        // -----------------------------
        // ✅ Final Response
        // -----------------------------
        return res.status(200).json({
            success: true,
            message: "Invoices fetched successfully",
            params,
            appliedFilters,
            pagination,
            totals: {
                totalInvoices: totals.totalInvoices,
                totalAmount: Number(totals.totalAmount?.toFixed(2)) || 0,
                totalDiscount: Number(totals.totalDiscount?.toFixed(2)) || 0,
                received: totals.received,
                receivable: totals.receivable,
                partial: totals.partial,
            },
            data: invoices,
        });
    } catch (err) {
        console.error("❌ Error fetching invoices:", err);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching invoices",
            error: err.message,
        });
    }
};
