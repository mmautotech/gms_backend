import mongoose from "mongoose";
import Booking from "../../models/Booking.js";

const ALLOWED_STATUS = new Set(["pending", "arrived", "completed", "cancelled"]);

export const getAllBookings = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 25,
            sortBy = "createdDate",
            sortDir,
            status,
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
            : DATE_FIELDS.has(sortBy)
                ? "desc"
                : "asc";

        const sortOrder = effectiveSortDir === "desc" ? -1 : 1;

        const filter = {};

        if (typeof status === "string" && status.trim() !== "") {
            const normStatus = status.trim().toLowerCase();
            if (ALLOWED_STATUS.has(normStatus)) {
                filter.status = normStatus;
            }
        }

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

        if (services) {
            const ids = String(services)
                .split(",")
                .map((id) => id.trim())
                .filter((id) => mongoose.Types.ObjectId.isValid(id));
            if (ids.length > 0) filter.services = { $in: ids };
        }

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
                status: typeof status === "string" && status.trim() ? status.trim().toLowerCase() : null,
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
