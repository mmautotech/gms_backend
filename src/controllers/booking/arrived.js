import mongoose from "mongoose";
import Booking from "../../models/Booking.js";
import { sendError } from "../../utils/errorHandler.js";

/**
 * Get all arrived bookings with pagination
 */
export const getAllArrivedBookings = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 25,
            sortBy = "arrivedAt",
            sortDir = "desc",
            fromDate,
            toDate,
            search,
            services,
        } = req.query;

        // Sanitize page and limit
        page = Math.max(1, Number(page) || 1);
        limit = Math.min(100, Math.max(1, Number(limit) || 25));
        const skip = (page - 1) * limit;
        const sortOrder = sortDir?.toLowerCase() === "asc" ? 1 : -1;

        // Whitelist allowed sort fields
        const allowedSortFields = ["arrivedAt", "createdAt", "scheduledDate", "vehicleRegNo"];
        if (!allowedSortFields.includes(sortBy)) sortBy = "arrivedAt";

        const filter = { status: "arrived" };

        // Date range filter
        if (fromDate || toDate) {
            filter.arrivedAt = {};
            if (fromDate) filter.arrivedAt.$gte = new Date(fromDate);
            if (toDate) {
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999);
                filter.arrivedAt.$lte = to;
            }
        }

        // Search filter
        if (search) {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [
                { vehicleRegNo: regex },
                { makeModel: regex },
                { ownerName: regex },
                { ownerEmail: regex },
                { ownerNumber: regex },
                { remarks: regex },
            ];
        }

        // Services filter
        let serviceIds = [];
        if (services) {
            serviceIds = String(services)
                .split(",")
                .map((id) => id.trim())
                .filter((id) => mongoose.Types.ObjectId.isValid(id));
            if (serviceIds.length > 0) filter.services = { $in: serviceIds };
        }

        // Get total count
        const total = await Booking.countDocuments(filter);

        // Get bookings with fallback sort (arrivedAt desc, then createdAt desc)
        const bookings = await Booking.find(filter)
            .populate("createdBy", "username") // populate username only
            .select("-bookingConfirmationPhoto") // remove photo from response
            .sort({ [sortBy]: sortOrder, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Add rowNumber
        const data = bookings.map((b, index) => ({
            ...b,
            _id: b._id.toString(),
            rowNumber: skip + index + 1,
        }));

        res.json({
            success: true,
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
                hasPrevPage: page > 1,
            },
            meta: {
                sortBy,
                sortDir,
                appliedFilters: { fromDate, toDate, search, services: serviceIds },
            },
        });
    } catch (err) {
        console.error("Get Arrived Bookings Error:", err);
        sendError(res, 500, err.message);
    }
};