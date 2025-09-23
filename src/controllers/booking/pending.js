import mongoose from "mongoose";
import Booking from "../../models/Booking.js";
import { sendError } from "../../utils/errorHandler.js";

export const getAllPendingBookings = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 25,
            sortBy = "createdDate",
            sortDir = "desc",
            fromDate,
            toDate,
            search,
            services,
        } = req.query;

        page = Number(page);
        limit = Number(limit);
        const allowedLimits = [5, 25, 50, 100];
        if (!allowedLimits.includes(limit)) limit = 25;
        const skip = (page - 1) * limit;

        // ✅ Only pending bookings
        const filter = { status: "pending" };

        // -------------------------
        // 📌 Sorting
        // -------------------------
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

        // -------------------------
        // 📌 Date filtering
        // -------------------------
        const dateField = dbSortField === "scheduledDate" ? "scheduledDate" : "createdAt";
        if (fromDate || toDate) {
            filter[dateField] = {};
            if (fromDate) filter[dateField].$gte = new Date(fromDate);
            if (toDate) {
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999);
                filter[dateField].$lte = to;
            }
        }

        // -------------------------
        // 📌 Search
        // -------------------------
        if (search) {
            const regex = new RegExp(search, "i");
            filter.$or = [
                { vehicleRegNo: regex },   // registration
                { ownerNumber: regex },    // phoneNumber
                { ownerPostalCode: regex } // postCode
            ];
        }

        // -------------------------
        // 📌 Services filter
        // -------------------------
        if (services) {
            const ids = services
                .split(",")
                .map((id) => id.trim())
                .filter((id) => mongoose.Types.ObjectId.isValid(id));
            if (ids.length > 0) filter.services = { $in: ids };
        }

        // -------------------------
        // 📌 Query
        // -------------------------
        const total = await Booking.countDocuments(filter);

        const bookings = await Booking.find(filter)
            .populate([{ path: "createdBy", select: "username" }])
            .sort({ [dbSortField]: sortOrder })
            .skip(skip)
            .limit(limit)
            .lean();

        // -------------------------
        // 📌 Transform
        // -------------------------
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

        res.json({
            success: true,
            params: {
                search: search || null,
                fromDate: fromDate || null,
                toDate: toDate || null,
                status: "pending",
                services: services || null,
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
