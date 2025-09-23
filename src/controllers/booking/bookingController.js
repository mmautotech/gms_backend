import mongoose from "mongoose";
import Booking from "../../models/Booking.js";
import Service from "../../models/Service.js";

import { sendError } from "../../utils/errorHandler.js";
import { computeTotals } from "../../utils/bookingHelpers.js";
import { BOOKING_STATUS, BOOKING_POPULATE } from "../../constants/bookingConstants.js";

/**
 * Validate service IDs against DB
 */
const validateServiceIds = async (serviceIds = [], context = "services") => {
    const validIds = serviceIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const found = await Service.find({ _id: { $in: validIds } });
    const foundSet = new Set(found.map((s) => s._id.toString()));
    const invalid = validIds.filter((id) => !foundSet.has(id));

    if (invalid.length > 0) {
        throw new Error(`Invalid ${context} ID(s): ${invalid.join(", ")}`);
    }
};


/**
 * --- Create Booking ---
 */
export const createBooking = async (req, res) => {
    try {
        const {
            prebookingServices = [],
            services = [],
            upsells = [],
        } = req.body;

        await validateServiceIds(prebookingServices, "prebookingServices");
        await validateServiceIds(services, "services");

        for (let i = 0; i < upsells.length; i++) {
            await validateServiceIds(upsells[i]?.services || [], `upsells[${i}].services`);
        }

        const booking = new Booking({
            ...req.body,
            status: BOOKING_STATUS.PENDING,
            createdBy: req.user?._id,
        });

        await computeTotals(booking);
        await booking.save();

        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            booking, // 👈 return booking
        });
    } catch (error) {
        console.error("Create Booking Error:", error);
        sendError(res, 400, error.message);
    }
};

// ✅ Allowed statuses in the same casing as your DB (lowercase)
const ALLOWED_STATUS = new Set(["pending", "arrived", "completed", "cancelled"]);

export const getAllBookings = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 25,
            sortBy = "createdDate",  // default field
            sortDir,                 // let us compute default if undefined
            status,
            fromDate,
            toDate,
            search,
            services,
        } = req.query;

        // -------------------------
        // 📌 Pagination
        // -------------------------
        page = Number(page);
        limit = Number(limit);
        const allowedLimits = [5, 25, 50, 100];
        if (!allowedLimits.includes(limit)) limit = 25;
        const skip = (page - 1) * limit;

        // -------------------------
        // 📌 Sorting Field Map
        // -------------------------
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
        const dbSortField = SORT_FIELD_MAP[sortBy] ?? SORT_FIELD_MAP.createdDate;

        // Default direction by field
        const DATE_FIELDS = new Set([
            "createdDate",
            "scheduledDate",
            "arrivedDate",
            "cancelledDate",
            "completedDate",
        ]);
        const userProvidedSortDir = typeof req.query.sortDir !== "undefined";
        const effectiveSortDir = userProvidedSortDir
            ? String(sortDir).toLowerCase()
            : (DATE_FIELDS.has(sortBy) ? "desc" : "asc");

        const sortOrder = effectiveSortDir === "desc" ? -1 : 1;

        // -------------------------
        // 📌 Filters
        // -------------------------
        const filter = {};

        // Status filter
        if (typeof status === "string" && status.trim() !== "") {
            const normStatus = status.trim().toLowerCase();
            if (ALLOWED_STATUS.has(normStatus)) {
                filter.status = normStatus;
            }
        }

        // Date range filter
        if (fromDate || toDate) {
            const toDateObj = toDate ? new Date(toDate) : null;
            const fromDateObj = fromDate ? new Date(fromDate) : null;

            const DATE_FIELD_MAP = {
                createdDate: "createdAt",
                scheduledDate: "scheduledDate",
                arrivedDate: "arrivedAt",
                cancelledDate: "cancelledAt",
                completedDate: "completedAt",
            };

            // If sortBy is a date field → filter on that
            // Else → fallback to createdAt
            const dateFilterField = DATE_FIELD_MAP[sortBy] || "createdAt";

            filter[dateFilterField] = {};
            if (fromDateObj) filter[dateFilterField].$gte = fromDateObj;
            if (toDateObj) {
                toDateObj.setHours(23, 59, 59, 999);
                filter[dateFilterField].$lte = toDateObj;
            }
            if (Object.keys(filter[dateFilterField]).length === 0) {
                delete filter[dateFilterField];
            }
        }

        // Search filter
        if (typeof search === "string" && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [
                { vehicleRegNo: regex },
                { makeModel: regex },
                { ownerName: regex },
                { ownerAddress: regex },
                { ownerPostalCode: regex },
                { ownerEmail: regex },
                { ownerNumber: regex },
                { remarks: regex },
            ];
        }

        // Services filter
        if (services) {
            const ids = String(services)
                .split(",")
                .map((id) => id.trim())
                .filter((id) => mongoose.Types.ObjectId.isValid(id));
            if (ids.length > 0) filter.services = { $in: ids };
        }

        // -------------------------
        // 📌 Query Execution
        // -------------------------
        const total = await Booking.countDocuments(filter);

        const projection = `
          createdAt createdBy scheduledDate
          cancelledAt cancelledBy
          arrivedAt arrivedBy
          completedAt completedBy
          status
          vehicleRegNo makeModel ownerName ownerAddress
          ownerPostalCode ownerEmail ownerNumber remarks
          services labourCost partsCost bookingPrice
        `;

        const SLIM_POPULATE = [
            { path: "createdBy", select: "username" },
            { path: "arrivedBy", select: "username" },
            { path: "cancelledBy", select: "username" },
            { path: "completedBy", select: "username" },
            { path: "services", select: "name" },
        ];

        const bookings = await Booking.find(filter)
            .select(projection)
            .populate(SLIM_POPULATE)
            .sort({ [dbSortField]: sortOrder, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // -------------------------
        // 📌 Response Formatting
        // -------------------------
        const data = bookings.map((b, index) => ({
            id: b._id.toString(),
            rowNumber: skip + index + 1,
            createdDate: b.createdAt,
            scheduledDate: b.scheduledDate,
            createdBy: b.createdBy?.username ?? null,
            cancelledDate: b.cancelledAt ?? null,
            cancelledBy: b.cancelledBy?.username ?? null,
            arrivedDate: b.arrivedAt ?? null,
            arrivedBy: b.arrivedBy?.username ?? null,
            completedDate: b.completedAt ?? null,
            completedBy: b.completedBy?.username ?? null,
            status: b.status,
            vehicleRegNo: b.vehicleRegNo,
            makeModel: b.makeModel,
            ownerName: b.ownerName,
            ownerAddress: b.ownerAddress,
            ownerPostalCode: b.ownerPostalCode,
            ownerEmail: b.ownerEmail,
            ownerNumber: b.ownerNumber,
            remarks: b.remarks,
            services: Array.isArray(b.services)
                ? b.services.map((s) => s?.name).filter(Boolean)
                : [],
            labourCost: b.labourCost,
            partsCost: b.partsCost,
            bookingPrice: b.bookingPrice,
        }));

        res.json({
            success: true,
            params: {
                search: typeof search === "string" && search.trim() ? search.trim() : null,
                fromDate: fromDate || null,
                toDate: toDate || null,
                status: typeof status === "string" && status.trim()
                    ? status.trim().toLowerCase()
                    : null,
                services: services || null,
                sortBy,
                sortDir: effectiveSortDir,
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
        console.error("Get All Bookings Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * --- Get All Pending Bookings with Conditional Filters + Metadata ---
 */
export const getAllPendingBookings = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 25,
            sortBy = "createdAt",
            sortDir = "desc",
            status,
            fromDate,
            toDate,
            search,
            services, // can be single ID or comma-separated IDs
        } = req.query;

        // 🧮 Pagination & Sorting
        page = Number(page);
        limit = Number(limit);
        const allowedLimits = [5, 25, 50, 100];
        if (!allowedLimits.includes(limit)) limit = 25;
        const skip = (page - 1) * limit;
        const sortOrder = sortDir?.toLowerCase() === "asc" ? 1 : -1;

        // 🧮 Filters (build only from provided params)
        const filter = {};

        // 🔐 Normalize status to uppercase
        if (status) {
            filter.status = status.toUpperCase();
        }

        // 📅 Date range on scheduledDate
        if (fromDate || toDate) {
            filter.scheduledDate = {};
            if (fromDate) filter.scheduledDate.$gte = new Date(fromDate);
            if (toDate) {
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999); // include full day
                filter.scheduledDate.$lte = to;
            }
        }

        // 🔎 Multi-field search
        if (search) {
            const regex = new RegExp(search, "i");
            filter.$or = [
                { bookingNo: regex },
                { vehicleRegNo: regex },
                { makeModel: regex },
                { ownerName: regex },
                { ownerAddress: regex },
                { ownerPostalCode: regex },
                { ownerEmail: regex },
                { ownerNumber: regex },
                { remarks: regex },
            ];
        }

        // 🔧 Service filter (single or multiple IDs)
        if (services) {
            const ids = services
                .split(",")
                .map((id) => id.trim())
                .filter((id) => mongoose.Types.ObjectId.isValid(id));
            if (ids.length > 0) {
                filter.services = { $in: ids };
            }
        }

        // 📊 Count + Fetch
        const total = await Booking.countDocuments(filter);

        const bookings = await Booking.find(filter)
            .populate(BOOKING_POPULATE)
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit)
            .lean();

        // Continuous row numbers
        const bookingsWithRowNumber = bookings.map((b, index) => ({
            ...b,
            rowNumber: skip + index + 1,
        }));

        // ✅ Response with metadata
        res.json({
            success: true,
            data: bookingsWithRowNumber,
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
                appliedFilters: {
                    status: status || null,
                    fromDate: fromDate || null,
                    toDate: toDate || null,
                    search: search || null,
                    services: services || null,
                },
            },
        });
    } catch (error) {
        console.error("Get All Bookings Error:", error);
        sendError(res, 500, error.message);
    }
};


/**
 * --- Get Booking by ID ---
 */
export const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 400, "Invalid booking ID");
        }

        const booking = await Booking.findById(id).populate(BOOKING_POPULATE);
        if (!booking) return sendError(res, 404, "Booking not found");

        res.json({
            success: true,
            booking, // 👈 return booking
        });
    } catch (error) {
        console.error("Get Booking Error:", error);
        sendError(res, 500, error.message);
    }
};


/**
 * --- Update Booking ---
 */
export const updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 400, "Invalid booking ID");
        }
        if (!req.body || Object.keys(req.body).length === 0) {
            return sendError(res, 400, "No update fields provided");
        }

        let booking = await Booking.findById(id);
        if (!booking) return sendError(res, 404, "Booking not found");

        const allowedUpdateFields = [
            "vehicleRegNo",
            "makeModel",
            "ownerName",
            "ownerAddress",
            "ownerPostalCode",
            "ownerNumber",
            "ownerEmail",
            "bookingConfirmationPhoto",
            "source",
            "scheduledDate",
            "remarks",
            "prebookingLabourCost",
            "prebookingPartsCost",
            "prebookingBookingPrice",
            "prebookingServices",
        ];

        if (req.body.hasOwnProperty("prebookingServices")) {
            await validateServiceIds(req.body.prebookingServices, "prebookingServices");
        }

        for (const key of allowedUpdateFields) {
            if (req.body.hasOwnProperty(key)) {
                booking[key] = req.body[key];
            }
        }

        booking.updatedBy = req.user?._id;

        const costFields = [
            "prebookingServices",
            "prebookingLabourCost",
            "prebookingPartsCost",
            "prebookingBookingPrice",
        ];
        if (Object.keys(req.body).some((field) => costFields.includes(field))) {
            await computeTotals(booking);
        }

        await booking.save({ runValidators: true });

        res.json({
            success: true,
            message: `Booking ${booking._id} updated successfully`,
            booking, // 👈 return updated booking
        });
    } catch (error) {
        console.error("Update Booking Error:", error);
        sendError(res, 400, error.message);
    }
};


/**
 * --- Update Booking Status ---
 */
export const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 400, "Invalid booking ID");
        }
        if (!status) {
            return sendError(res, 400, "New status is required");
        }

        let booking = await Booking.findById(id);
        if (!booking) {
            return sendError(res, 404, "Booking not found");
        }

        const allowedTransitions = {
            [BOOKING_STATUS.PENDING]: [BOOKING_STATUS.ARRIVED, BOOKING_STATUS.CANCELLED],
            [BOOKING_STATUS.ARRIVED]: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED],
            [BOOKING_STATUS.COMPLETED]: [],
            [BOOKING_STATUS.CANCELLED]: [],
        };

        if (!allowedTransitions[booking.status].includes(status)) {
            return sendError(res, 400, `Invalid status transition: ${booking.status} → ${status}`);
        }

        const userId = req.user?._id;
        const userName = req.user?.username || "Unknown user";
        const now = new Date();

        booking.status = status;
        booking.updatedBy = userId;

        switch (status) {
            case BOOKING_STATUS.ARRIVED:
                booking.arrivedAt = now;
                booking.arrivedBy = userId;
                break;
            case BOOKING_STATUS.COMPLETED:
                booking.completedAt = now;
                booking.completedBy = userId;
                break;
            case BOOKING_STATUS.CANCELLED:
                booking.cancelledAt = now;
                booking.cancelledBy = userId;
                break;
        }

        await booking.save({ allowEdit: true });

        return res.json({
            success: true,
            message: `Marked as ${status} by ${userName}`,
            booking, // 👈 return updated booking
        });
    } catch (error) {
        console.error("Update Booking Status Error:", error);
        sendError(res, 500, error.message);
    }
};
