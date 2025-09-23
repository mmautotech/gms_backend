// src/controllers/booking/getAllPendingBookings.js
import Booking from "../../models/Booking.js";
import { sendError } from "../../utils/errorHandler.js";

export const getAllPendingBookings = async (req, res) => {
    try {
        // Always pending
        const filter = { status: "pending" };

        let {
            page = 1,
            limit = 25,
            sortBy = "createdDate",
            sortDir = "desc",
            fromDate,
            toDate,
            search,
        } = req.query;

        // 📌 Pagination
        limit = Number(limit);
        const allowedLimits = [5, 25, 50, 100];
        if (!allowedLimits.includes(limit)) limit = 25;

        page = Number(page);
        const skip = (page - 1) * limit;

        // 📌 Sorting
        const SORT_FIELD_MAP = {
            createdDate: "createdAt",
            scheduledDate: "scheduledDate",
            vehicleRegNo: "vehicleRegNo",
            ownerNumber: "ownerNumber",
            ownerPostalCode: "ownerPostalCode",
            bookingPrice: "bookingPrice",
        };
        const dbSortField = SORT_FIELD_MAP[sortBy] || "createdAt";
        const sortOrder = sortDir?.toLowerCase() === "asc" ? 1 : -1;

        // 📌 Date filtering
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;
        if (to) to.setHours(23, 59, 59, 999);

        const dateField = dbSortField === "scheduledDate" ? "scheduledDate" : "createdAt";
        if (from || to) {
            filter[dateField] = {};
            if (from) filter[dateField].$gte = from;
            if (to) filter[dateField].$lte = to;
        }

        // 📌 Search (regex for lightweight fields)
        if (search) {
            const regex = new RegExp(search, "i");
            filter.$or = [
                { vehicleRegNo: regex },
                { ownerNumber: regex },
                { ownerPostalCode: regex },
            ];
        }

        // 📌 Query
        const total = await Booking.countDocuments(filter);

        const bookings = await Booking.find(filter)
            .select(
                "createdAt scheduledDate vehicleRegNo ownerNumber ownerPostalCode bookingPrice createdBy"
            )
            .populate([{ path: "createdBy", select: "username" }])
            .sort({ [dbSortField]: sortOrder })
            .skip(skip)
            .limit(limit)
            .lean();

        // 📌 Transform
        const data = bookings.map((b, index) => ({
            id: b._id,
            rowNumber: skip + index + 1,
            bookingDate: b.createdAt,
            scheduledDate: b.scheduledDate,
            registration: b.vehicleRegNo,
            phoneNumber: b.ownerNumber,
            postCode: b.ownerPostalCode,
            bookingPrice: b.bookingPrice,
            bookedBy: b.createdBy?.username ?? null,
        }));

        // 📌 Response
        res.json({
            success: true,
            params: {
                search: search || null,
                fromDate: fromDate || null,
                toDate: toDate || null,
                sortBy,
                sortDir: sortDir || "desc",
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
            data,
        });
    } catch (error) {
        console.error("Get All Pending Bookings Error:", error);
        sendError(res, 500, error.message);
    }
};
