// controllers/dashboardController.js
import Invoice from "../models/Invoice.js";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";

// GET /admin/dashboard/stats
export const getDashboardStats = async (req, res) => {
    try {
        /** -------------------------------
         * Revenue by different intervals
         -------------------------------- */
        const revenue = {};

        const today = new Date();
        const past30 = new Date();
        past30.setDate(today.getDate() - 29); // last 30 days

        // Daily Revenue (last 30 days)
        revenue.daily = await Invoice.aggregate([
            {
                $match: {
                    totalAmount: { $gt: 0 },
                    invoiceDate: { $gte: past30, $lte: today },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$invoiceDate" } },
                    totalRevenue: { $sum: "$totalAmount" },
                },
            },
            { $sort: { "_id": 1 } },
        ]);

        // Weekly Revenue (last 12 weeks)
        const past12Weeks = new Date();
        past12Weeks.setDate(today.getDate() - 7 * 11); // last 12 weeks

        revenue.weekly = await Invoice.aggregate([
            {
                $match: {
                    totalAmount: { $gt: 0 },
                    invoiceDate: { $gte: past12Weeks, $lte: today },
                },
            },
            {
                $group: {
                    _id: {
                        isoWeek: { $isoWeek: "$invoiceDate" },
                        year: { $year: "$invoiceDate" },
                    },
                    totalRevenue: { $sum: "$totalAmount" },
                },
            },
            { $sort: { "_id.year": 1, "_id.isoWeek": 1 } },
        ]);

        // Monthly Revenue
        const revenueData = await Invoice.aggregate([
            { $match: { totalAmount: { $gt: 0 } } },
            {
                $group: {
                    _id: { $month: "$invoiceDate" },
                    totalRevenue: { $sum: "$totalAmount" },
                },
            },
            { $sort: { "_id": 1 } },
        ]);
        const monthlyRevenue = Array(12).fill(0);
        revenueData.forEach((r) => {
            if (r._id >= 1 && r._id <= 12) monthlyRevenue[r._id - 1] = r.totalRevenue;
        });
        revenue.monthly = monthlyRevenue;

        // Yearly Revenue
        revenue.yearly = await Invoice.aggregate([
            { $match: { totalAmount: { $gt: 0 } } },
            {
                $group: {
                    _id: { $year: "$invoiceDate" },
                    totalRevenue: { $sum: "$totalAmount" },
                },
            },
            { $sort: { "_id": 1 } },
        ]);

        /** -------------------------------
         * Service Trends by Interval (FIXED)
         -------------------------------- */
        const serviceTrends = {};
        const intervals = [
            { name: "daily", start: past30, format: "%Y-%m-%d" },
            { name: "weekly", start: past12Weeks, format: "%Y-%U" },
            { name: "monthly", start: null, format: "%Y-%m" },
            { name: "yearly", start: null, format: "%Y" },
        ];

        for (const interval of intervals) {
            // Match bookings that have prebookingServices
            const matchStage = { prebookingServices: { $ne: null } };

            // Daily/weekly filtering using bookingDate OR fallback to createdAt
            if (interval.start) {
                matchStage.$or = [
                    { bookingDate: { $gte: interval.start, $lte: today } },
                    { bookingDate: null, createdAt: { $gte: interval.start, $lte: today } },
                ];
            }

            const data = await Booking.aggregate([
                { $unwind: "$prebookingServices" },
                { $match: matchStage },
                {
                    $group: {
                        _id: {
                            service: "$prebookingServices",
                            period: {
                                $dateToString: {
                                    format: interval.format,
                                    date: { $ifNull: ["$bookingDate", "$createdAt"] },
                                },
                            },
                        },
                        count: { $sum: 1 },
                    },
                },
                {
                    $lookup: {
                        from: "services",
                        localField: "_id.service",
                        foreignField: "_id",
                        as: "service",
                    },
                },
                { $unwind: "$service" },
                {
                    $project: {
                        service: { $ifNull: ["$service.name", "$_id.service"] },
                        period: "$_id.period",
                        count: 1,
                    },
                },
                { $sort: { period: 1, count: -1 } },
            ]);

            serviceTrends[interval.name] = data;
        }

        /** -------------------------------
         * Booking Stats
         -------------------------------- */
        const bookingStatusData = await Booking.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);

        const bookings = { total: await Booking.countDocuments() };
        bookingStatusData.forEach((b) => {
            bookings[b._id] = b.count;
        });

        /** -------------------------------
         * Response
         -------------------------------- */
        res.json({
            revenue,
            serviceTrends,
            bookings,
        });
    } catch (err) {
        console.error("Dashboard Stats Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
