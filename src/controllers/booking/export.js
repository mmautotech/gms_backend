import mongoose from "mongoose";
import Booking from "../../models/Booking.js";
import { Parser } from "json2csv";   // npm i json2csv

// Allowed status values
const ALLOWED_STATUS = new Set(["pending", "arrived", "completed", "cancelled"]);

export const exportBookings = async (req, res) => {
    try {
        let {
            sortBy = "createdDate",
            sortDir,
            status,
            fromDate,
            toDate,
            search,
            services,
            user, // ✅ added
        } = req.query;

        // Sorting map (accept both frontend and backend naming)
        const SORT_FIELD_MAP = {
            createdDate: "createdAt",
            scheduledDate: "scheduledDate",
            arrivedDate: "arrivedAt",
            arrivedAt: "arrivedAt",
            cancelledDate: "cancelledAt",
            cancelledAt: "cancelledAt",
            completedDate: "completedAt",
            completedAt: "completedAt",
            vehicleRegNo: "vehicleRegNo",
            makeModel: "makeModel",
            ownerPostalCode: "ownerPostalCode",
            ownerNumber: "ownerNumber",
        };
        const dbSortField = SORT_FIELD_MAP[sortBy] ?? "createdAt";

        const DATE_FIELDS = new Set([
            "createdDate",
            "scheduledDate",
            "arrivedDate",
            "arrivedAt",
            "cancelledDate",
            "cancelledAt",
            "completedDate",
            "completedAt",
        ]);
        const userProvidedSortDir = typeof sortDir !== "undefined";
        const effectiveSortDir = userProvidedSortDir
            ? String(sortDir).toLowerCase()
            : DATE_FIELDS.has(sortBy)
                ? "desc"
                : "asc";
        const sortOrder = effectiveSortDir === "desc" ? -1 : 1;

        // -------------------------
        // 📌 Build Filters
        // -------------------------
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
                arrivedAt: "arrivedAt",
                cancelledDate: "cancelledAt",
                cancelledAt: "cancelledAt",
                completedDate: "completedAt",
                completedAt: "completedAt",
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
            const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(safeSearch, "i");
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

        if (user && mongoose.Types.ObjectId.isValid(user)) {
            filter.createdBy = user; // ✅ added user filter
        }

        // -------------------------
        // 📌 Query all data (no pagination)
        // -------------------------
        const SLIM_POPULATE = [
            { path: "createdBy", select: "username" },
            { path: "arrivedBy", select: "username" },
            { path: "cancelledBy", select: "username" },
            { path: "completedBy", select: "username" },
            { path: "services", select: "name" },
        ];

        const bookings = await Booking.find(filter)
            .populate(SLIM_POPULATE)
            .sort({ [dbSortField]: sortOrder, _id: -1 })
            .lean();

        // -------------------------
        // 📌 Prepare CSV Data
        // -------------------------
        const formatted = bookings.map((b, i) => ({
            Row: i + 1,
            CreatedDate: b.createdAt ? new Date(b.createdAt).toISOString() : "",
            ScheduledDate: b.scheduledDate ? new Date(b.scheduledDate).toISOString() : "",
            CreatedBy: b.createdBy?.username ?? "",
            ArrivedDate: b.arrivedAt ? new Date(b.arrivedAt).toISOString() : "",
            ArrivedBy: b.arrivedBy?.username ?? "",
            CompletedDate: b.completedAt ? new Date(b.completedAt).toISOString() : "",
            CompletedBy: b.completedBy?.username ?? "",
            CancelledDate: b.cancelledAt ? new Date(b.cancelledAt).toISOString() : "",
            CancelledBy: b.cancelledBy?.username ?? "",
            Status: b.status,
            VehicleRegNo: b.vehicleRegNo,
            MakeModel: b.makeModel,
            OwnerName: b.ownerName,
            OwnerAddress: b.ownerAddress,
            OwnerPostalCode: b.ownerPostalCode,
            OwnerEmail: b.ownerEmail,
            OwnerNumber: b.ownerNumber,
            Remarks: b.remarks,
            Services: Array.isArray(b.services)
                ? b.services.map((s) => s?.name).join(", ")
                : "",
            LabourCost: b.labourCost,
            PartsCost: b.partsCost,
            BookingPrice: b.bookingPrice,
        }));

        const parser = new Parser();
        const csv = parser.parse(formatted);

        res.header("Content-Type", "text/csv");
        res.attachment("bookings_export.csv");
        return res.send(csv);
    } catch (error) {
        console.error("Export Bookings Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};
