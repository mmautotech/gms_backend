import mongoose from "mongoose";
import PurchaseInvoice from "../../models/PurchaseInvoice.js";

export const getInvoices = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 25,
            sortBy = "createdAt",
            sortOrder = "desc",
            supplier,
            purchaser,
            booking,
            part,
            paymentStatus,
            search,
            fromDate,
            toDate,
        } = req.query;

        page = Number(page);
        limit = Number(limit);

        // ✅ enforce allowed limits
        const ALLOWED_LIMITS = [5, 25, 50, 100];
        if (!ALLOWED_LIMITS.includes(limit)) limit = 25;

        const skip = (page - 1) * limit;

        // ✅ sorting
        const SORT_FIELD_MAP = { createdAt: "createdAt", paymentDate: "paymentDate" };
        const dbSortField = SORT_FIELD_MAP[sortBy] ?? "createdAt";
        const sortDir = sortOrder.toLowerCase() === "asc" ? 1 : -1;

        // ✅ base filter
        const match = { isActive: true };

        // 🔹 Admin can filter any purchaser, non-admin only their own
        // 🔹 Purchaser filter (applies only if passed explicitly in query)
        if (purchaser && mongoose.isValidObjectId(purchaser)) {
            match.purchaser = new mongoose.Types.ObjectId(purchaser);
        }


        if (supplier && mongoose.isValidObjectId(supplier)) {
            match.supplier = new mongoose.Types.ObjectId(supplier);
        }
        if (booking && mongoose.isValidObjectId(booking)) {
            match.booking = new mongoose.Types.ObjectId(booking);
        }
        if (paymentStatus) match.paymentStatus = paymentStatus;
        if (part && mongoose.isValidObjectId(part)) {
            match["items.part"] = new mongoose.Types.ObjectId(part);
        }

        if (fromDate || toDate) {
            match.paymentDate = {};
            if (fromDate) match.paymentDate.$gte = new Date(fromDate);
            if (toDate) {
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999);
                match.paymentDate.$lte = to;
            }
        }

        // ✅ Initial pipeline
        const basePipeline = [{ $match: match }];

        // ✅ Count before lookups (avoids duplicate rows due to unwind)
        const totalCountAgg = await PurchaseInvoice.aggregate([
            ...basePipeline,
            { $count: "count" },
        ]);
        const totalCount = totalCountAgg.length ? totalCountAgg[0].count : 0;

        // ✅ Lookups
        const pipeline = [
            ...basePipeline,
            { $lookup: { from: "users", localField: "purchaser", foreignField: "_id", as: "purchaser" } },
            { $unwind: { path: "$purchaser", preserveNullAndEmptyArrays: true } },
            { $lookup: { from: "suppliers", localField: "supplier", foreignField: "_id", as: "supplier" } },
            { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },
            { $lookup: { from: "bookings", localField: "booking", foreignField: "_id", as: "booking" } },
            { $unwind: { path: "$booking", preserveNullAndEmptyArrays: true } },
            { $lookup: { from: "parts", localField: "items.part", foreignField: "_id", as: "partsInfo" } },
        ];

        // ✅ Merge part info
        pipeline.push({
            $addFields: {
                items: {
                    $map: {
                        input: "$items",
                        as: "item",
                        in: {
                            rate: "$$item.rate",
                            quantity: "$$item.quantity",
                            part: {
                                $arrayElemAt: [
                                    {
                                        $filter: {
                                            input: "$partsInfo",
                                            as: "pi",
                                            cond: { $eq: ["$$pi._id", "$$item.part"] },
                                        },
                                    },
                                    0,
                                ],
                            },
                        },
                    },
                },
            },
        });

        // ✅ search
        if (search) {
            const regex = new RegExp(search, "i");
            pipeline.push({
                $match: {
                    $or: [
                        { vendorInvoiceNumber: regex },
                        { "booking.vehicleRegNo": regex },
                        { "items.part.partName": regex },
                        { "items.part.partNumber": regex },
                    ],
                },
            });
        }

        // ✅ projection
        pipeline.push({
            $project: {
                purchaser: { _id: 1, username: 1 },
                supplier: { _id: 1, name: 1, contact: 1 },
                booking: { _id: 1, vehicleRegNo: 1, status: 1, scheduledDate: 1 },
                items: {
                    part: { _id: 1, partName: 1, partNumber: 1, price: 1 },
                    rate: 1,
                    quantity: 1,
                },
                paymentDate: 1,
                paymentStatus: 1,
                discount: 1,
                vatIncluded: 1,
                vendorInvoiceNumber: 1,
                vendorInvoicePhoto: 1,
                createdAt: 1,
                updatedAt: 1,
                isActive: 1,
            },
        });

        // ✅ sort + paginate
        pipeline.push({ $sort: { [dbSortField]: sortDir, _id: -1 } });
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: limit });

        const invoices = await PurchaseInvoice.aggregate(pipeline);

        res.json({
            success: true,
            params: {
                page,
                limit,
                sortBy,
                sortOrder: sortOrder.toLowerCase(),
                search: search || null,
                filters: { supplier, purchaser, booking, part, paymentStatus, fromDate, toDate },
            },
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page * limit < totalCount,
                hasPrevPage: page > 1,
            },
            data: invoices.map((inv, idx) => ({
                ...inv,
                rowNumber: skip + idx + 1,
            })),
        });
    } catch (err) {
        console.error("Get Invoices Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
