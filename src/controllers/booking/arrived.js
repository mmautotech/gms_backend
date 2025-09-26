// src/controllers/booking/getAllArrivedBookings.js
import Booking from "../../models/Booking.js";
import { sendError } from "../../utils/errorHandler.js";

export const getAllArrivedBookings = async (req, res) => {
    try {
        // Always arrived
        const filter = { status: "arrived" };

        let {
            page = 1,
            limit = 25,
            sortBy = "createdDate",
            sortDir,
            fromDate,
            toDate,
            search,
            services,
            user,
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
            arrivedDate: "arrivedAt",
            cancelledDate: "cancelledAt",
            completedDate: "completedAt",
            vehicleRegNo: "vehicleRegNo",
            makeModel: "makeModel",
            ownerPostalCode: "ownerPostalCode",
            ownerNumber: "ownerNumber",
        };
        const dbSortField = SORT_FIELD_MAP[sortBy] || "arrivedAt";

        const isDateField = ["createdAt", "scheduledDate", "arrivedAt"].includes(dbSortField);
        const sortOrder = sortDir
            ? sortDir.toLowerCase() === "asc"
                ? 1
                : -1
            : isDateField
                ? -1
                : 1;

        // 📌 Date filtering
        if (fromDate || toDate) {
            const dateField =
                dbSortField === "scheduledDate"
                    ? "scheduledDate"
                    : dbSortField === "createdAt"
                        ? "createdAt"
                        : "arrivedAt";
            filter[dateField] = {};
            if (fromDate) filter[dateField].$gte = new Date(fromDate);
            if (toDate) {
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999);
                filter[dateField].$lte = to;
            }
        }

        // 📌 Search (regex across multiple fields)
        if (search) {
            const regex = new RegExp(search, "i");
            filter.$or = [
                { vehicleRegNo: regex },
                { makeModel: regex },
                { ownerName: regex },
                { ownerEmail: regex },
                { ownerNumber: regex },
                { ownerPostalCode: regex },
            ];
        }

        // 📌 Services filter
        if (services) {
            const ids = String(services).split(",").map((id) => id.trim());
            filter.services = { $in: ids };
        }

        // 📌 User filter (match createdBy OR arrivedBy)
        if (user) {
            filter.$or = filter.$or || [];
            filter.$or.push({ createdBy: user }, { arrivedBy: user });
        }

        // 📌 Query
        const total = await Booking.countDocuments(filter);

        const bookings = await Booking.find(filter)
            .select(
                "createdAt arrivedAt vehicleRegNo makeModel ownerName ownerEmail ownerNumber ownerPostalCode bookingPrice createdBy arrivedBy services"
            )
            .populate([
                { path: "createdBy", select: "username" },
                { path: "arrivedBy", select: "username" },
                { path: "services", select: "name" },
            ])
            .sort({ [dbSortField]: sortOrder })
            .skip(skip)
            .limit(limit)
            .lean();

        // 📌 Transform
        const data = bookings.map((b, index) => ({
            id: b._id,
            rowNumber: skip + index + 1,
            bookingDate: b.createdAt,
            bookedBy: b.createdBy?.username ?? null,
            arrivalDate: b.arrivedAt,
            arrivedBy: b.arrivedBy?.username ?? null,
            registration: b.vehicleRegNo,
            makeModel: b.makeModel,
            ownerName: b.ownerName,
            email: b.ownerEmail,
            phoneNumber: b.ownerNumber,
            postCode: b.ownerPostalCode,
            bookingPrice: b.bookingPrice,
            services: b.services?.map((s) => s.name) || [],
        }));

        // 📌 Response
        res.json({
            success: true,
            params: {
                search: search || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                services: services || undefined,
                user: user || undefined,
                sortBy,
                sortDir: sortDir || (isDateField ? "desc" : "asc"),
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
        console.error("Get All Arrived Bookings Error:", error);
        sendError(res, 500, error.message);
    }
};
