// controllers/dashboardController.js
import Invoice from "../models/Invoice.js";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js"; // your Service model

// GET /admin/dashboard/stats
export const getDashboardStats = async (req, res) => {
    try {
        /** -------------------------------
         * Monthly Revenue
         -------------------------------- */
        const revenueData = await Invoice.aggregate([
            { $match: { totalAmount: { $gt: 0 } } },
            {
                $group: {
                    _id: { $month: "$invoiceDate" }, // month number 1-12
                    totalRevenue: { $sum: "$totalAmount" },
                },
            },
            { $sort: { "_id": 1 } },
        ]);

        const monthlyRevenue = Array(12).fill(0);
        revenueData.forEach(r => {
            if (r._id && r._id >= 1 && r._id <= 12) {
                monthlyRevenue[r._id - 1] = r.totalRevenue;
            }
        });

        /** -------------------------------
         * Service Trends
         * Count bookings per service by name
         -------------------------------- */
        const serviceTrendsData = await Booking.aggregate([
            { $unwind: "$prebookingServices" }, // explode array
            { $match: { "prebookingServices": { $ne: null } } },
            {
                $group: {
                    _id: "$prebookingServices", // currently service ID
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        // Lookup service names for trends
        const serviceTrendsWithNames = await Promise.all(
            serviceTrendsData.map(async s => {
                const service = await Service.findById(s._id).lean();
                return {
                    _id: service?.name || "Unknown Service",
                    count: s.count,
                };
            })
        );

        /** -------------------------------
         * Response
         -------------------------------- */
        res.json({
            monthlyRevenue,
            serviceTrends: serviceTrendsWithNames,
        });
    } catch (err) {
        console.error("Dashboard Stats Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
