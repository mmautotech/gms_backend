import Invoice from "../models/Invoice.js";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import moment from "moment";

// GET /admin/dashboard/stats
export const getDashboardStats = async (req, res) => {
    try {
        const revenue = {};

        const today = new Date();
        const startOfDay = moment(today).startOf('day').toDate();
        const past7Days = moment(today).subtract(6, 'days').startOf('day').toDate();
        const past30Days = moment(today).subtract(29, 'days').startOf('day').toDate();

        // -----------------------------
        // Daily Revenue (today by hour)
        // -----------------------------
        const dailyInvoices = await Invoice.find({
            status: "Receivable",
            createdAt: { $gte: startOfDay, $lte: today },
        });

        revenue.daily = dailyInvoices.map(inv => ({
            time: moment(inv.createdAt).format('HH:mm'),
            totalRevenue: inv.totalAmount
        }));

        // -----------------------------
        // Weekly Revenue (last 7 days)
        // -----------------------------
        const weeklyInvoices = await Invoice.find({
            status: "Receivable",
            createdAt: { $gte: past7Days, $lte: today },
        });

        revenue.weekly = [];
        for (let i = 0; i < 7; i++) {
            const day = moment(past7Days).add(i, 'days');
            const dayRevenue = weeklyInvoices
                .filter(inv => moment(inv.createdAt).isSame(day, 'day'))
                .reduce((sum, inv) => sum + inv.totalAmount, 0);
            revenue.weekly.push({ _id: day.format('YYYY-MM-DD'), totalRevenue: dayRevenue });
        }

        // -----------------------------
        // Monthly Revenue (per month)
        // -----------------------------
        revenue.monthly = [];
        for (let i = 0; i < 12; i++) {
            const monthStart = moment(today).startOf('year').add(i, 'months').startOf('month');
            let monthEnd = moment(monthStart).endOf('month');
            if (monthEnd.isAfter(today)) monthEnd = moment(today);

            const monthRevenue = await Invoice.aggregate([
                {
                    $match: {
                        status: "Receivable",
                        createdAt: { $gte: monthStart.toDate(), $lte: monthEnd.toDate() }
                    }
                },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ]);

            revenue.monthly.push({
                _id: monthStart.format('MMM'),
                totalRevenue: monthRevenue[0]?.total || 0
            });
        }

        // -----------------------------
        // Yearly Revenue (group by year)
        // -----------------------------
        const firstInvoice = await Invoice.findOne({ status: "Receivable" }).sort({ createdAt: 1 });
        const startYear = firstInvoice ? moment(firstInvoice.createdAt).year() : moment(today).year();
        const currentYear = moment(today).year();

        revenue.yearly = [];
        for (let y = startYear; y <= currentYear; y++) {
            const yearStart = moment().year(y).startOf('year');
            const yearEnd = moment().year(y).endOf('year');
            const yearRevenue = await Invoice.aggregate([
                {
                    $match: {
                        status: "Receivable",
                        createdAt: { $gte: yearStart.toDate(), $lte: yearEnd.toDate() }
                    }
                },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ]);

            revenue.yearly.push({
                _id: y.toString(),
                totalRevenue: yearRevenue[0]?.total || 0
            });
        }

        // -----------------------------
        // Service Trends by Interval
        // -----------------------------
        const serviceTrends = {};
        const intervals = [
            { name: "daily", start: past30Days, format: "%Y-%m-%d" },
            { name: "weekly", start: past7Days, format: "%Y-%U" },
            { name: "monthly", start: null, format: "%Y-%m" },
            { name: "yearly", start: null, format: "%Y" },
        ];

        for (const interval of intervals) {
            const matchStage = { prebookingServices: { $ne: null } };
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

        // -----------------------------
        // Booking Stats
        // -----------------------------
        const bookingStatusData = await Booking.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);

        const allStatuses = ["pending", "arrived", "completed", "cancelled"];
        const bookings = { total: await Booking.countDocuments() };
        allStatuses.forEach((status) => (bookings[status] = 0));

        bookingStatusData.forEach((b) => {
            const key = (b._id || "").toLowerCase();
            bookings[key] = b.count;
        });

        // -----------------------------
        // Send Response
        // -----------------------------
        res.json({
            success: true,
            message: "Dashboard stats fetched successfully",
            revenue,
            serviceTrends,
            bookings,
        });
    } catch (err) {
        console.error("Dashboard Stats Error:", err);
        res.status(500).json({
            success: false,
            message: "Server error while fetching dashboard stats",
            error: err.message,
        });
    }
};
