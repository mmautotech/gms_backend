// controllers/dashboardController.js
import Invoice from "../models/Invoice.js"; // Invoice model
import Booking from "../models/Booking.js"; // Booking model

// GET /admin/dashboard/stats
export const getDashboardStats = async (req, res) => {
    try {
        /** -------------------------------
         * Monthly Revenue
         * Using invoiceDate and totalAmount from invoices
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

        // Prepare monthlyRevenue array (Jan = index 0)
        const monthlyRevenue = Array(12).fill(0);
        revenueData.forEach((r) => {
            if (r._id && r._id >= 1 && r._id <= 12) {
                monthlyRevenue[r._id - 1] = r.totalRevenue;
            }
        });

        /** -------------------------------
         * Service Trends
         * Count each prebooking service
         -------------------------------- */
        const serviceTrendsData = await Booking.aggregate([
            { $unwind: "$prebookingServices" }, // explode array
            {
                $match: { "prebookingServices.name": { $exists: true, $ne: "" } }
            },
            {
                $group: {
                    _id: "$prebookingServices.name",
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        /** -------------------------------
         * Response
         -------------------------------- */
        res.json({
            monthlyRevenue,
            serviceTrends: serviceTrendsData,
        });
    } catch (err) {
        console.error("Dashboard Stats Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
