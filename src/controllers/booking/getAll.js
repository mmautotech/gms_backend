// src/controllers/booking/getAllBookings.js
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

        // 📌 Pagination
        limit = Number(limit);
        const allowedLimits = [5, 25, 50, 100];
        if (!allowedLimits.includes(limit)) limit = 25;

        page = Number(page);
        const skip = (page - 1) * limit;

        // 📌 Sort field mapping
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
        const dbSortField = SORT_FIELD_MAP[sortBy] ?? "createdAt";

        // 📌 Default sort direction
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

        // 📌 Filters
        const filter = {};

        if (typeof status === "string" && status.trim() !== "") {
            const normStatus = status.trim().toLowerCase();
            if (ALLOWED_STATUS.has(normStatus)) {
                filter.status = normStatus;
            }
        }

        // Date range filter
        if (fromDate || toDate) {
            const DATE_FIELD_MAP = {
                createdDate: "createdAt",
                scheduledDate: "scheduledDate",
                arrivedDate: "arrivedAt",
                cancelledDate: "cancelledAt",
                completedDate: "completedAt",
            };

            const dateFilterField = DATE_FIELD_MAP[sortBy] || "createdAt";
            filter[dateFilterField] = {};

            if (fromDate) filter[dateFilterField].$gte = new Date(fromDate);
            if (toDate) {
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999);
                filter[dateFilterField].$lte = to;
            }

            if (Object.keys(filter[dateFilterField]).length === 0) {
                delete filter[dateFilterField];
            }
        }

        // Text search
        if (typeof search === "string" && search.trim()) {
            filter.$text = { $search: search.trim() };
        }

        // Services filter
        if (services) {
            const ids = String(services)
                .split(",")
                .map((id) => id.trim())
                .filter((id) => mongoose.Types.ObjectId.isValid(id));
            if (ids.length > 0) filter.services = { $in: ids };
        }

        // 📌 Query
        const total = await Booking.countDocuments(filter);

        const projection = `
      createdAt updatedAt createdBy updatedBy scheduledDate
      cancelledAt cancelledBy
      arrivedAt arrivedBy
      completedAt completedBy
      status source
      vehicleRegNo makeModel ownerName ownerAddress
      ownerPostalCode ownerEmail ownerNumber remarks
      services labourCost partsCost bookingPrice
      prebookingServices prebookingLabourCost prebookingPartsCost prebookingBookingPrice
      bookingConfirmationPhoto bookingConfirmationPhotoCompressed bookingConfirmationPhotoType
      parts upsells
    `;

        const SLIM_POPULATE = [
            { path: "createdBy", select: "username" },
            { path: "arrivedBy", select: "username" },
            { path: "cancelledBy", select: "username" },
            { path: "completedBy", select: "username" },
            { path: "services", select: "name" },
            { path: "prebookingServices", select: "name" },
        ];

        const bookings = await Booking.find(filter)
            .select(projection)
            .populate(SLIM_POPULATE)
            .sort({ [dbSortField]: sortOrder, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // 📌 Transform
        const data = bookings.map((b, index) => ({
            id: b._id.toString(),
            rowNumber: skip + index + 1,

            bookingDate: b.createdAt,
            updatedDate: b.updatedAt ?? null,
            scheduledDate: b.scheduledDate,
            bookedBy: b.createdBy?.username ?? null,
            updatedBy: b.updatedBy ?? null,
            cancelledDate: b.cancelledAt ?? null,
            cancelledBy: b.cancelledBy?.username ?? null,
            arrivalDate: b.arrivedAt ?? null,
            arrivedBy: b.arrivedBy?.username ?? null,
            completedDate: b.completedAt ?? null,
            completedBy: b.completedBy?.username ?? null,
            status: b.status,

            registration: b.vehicleRegNo,
            makeModel: b.makeModel,
            ownerName: b.ownerName,
            ownerAddress: b.ownerAddress,
            postCode: b.ownerPostalCode,
            email: b.ownerEmail,
            phoneNumber: b.ownerNumber,

            remarks: b.remarks ?? null,
            source: b.source ?? null,

            // ✅ Prebooking info
            prebookingServices: Array.isArray(b.prebookingServices)
                ? b.prebookingServices.map((s) => s?.name || s.toString())
                : [],
            prebookingLabourCost: b.prebookingLabourCost ?? 0,
            prebookingPartsCost: b.prebookingPartsCost ?? 0,
            prebookingBookingPrice: b.prebookingBookingPrice ?? 0,

            // ✅ Services after arrival
            services: Array.isArray(b.services)
                ? b.services.map((s) => s?.name).filter(Boolean)
                : [],
            parts: b.parts ?? [],
            upsells: b.upsells ?? [],

            labourCost: b.labourCost ?? 0,
            partsCost: b.partsCost ?? 0,
            bookingPrice: b.bookingPrice ?? 0,

            // ✅ Photos (convert binary buffer → base64 string)
            bookingConfirmationPhoto: b.bookingConfirmationPhoto
                ? `data:${b.bookingConfirmationPhotoType};base64,${b.bookingConfirmationPhoto.toString("base64")}`
                : null,
            bookingConfirmationPhotoCompressed: b.bookingConfirmationPhotoCompressed
                ? `data:${b.bookingConfirmationPhotoType};base64,${b.bookingConfirmationPhotoCompressed.toString("base64")}`
                : null,
        }));

        // 📌 Response
        res.json({
            success: true,
            params: {
                search: search || null,
                fromDate: fromDate || null,
                toDate: toDate || null,
                status: status || null,
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
