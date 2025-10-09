import Invoice from "../../models/Invoice.js";

/**
 * 📊 Invoice Status Stats
 */
export const getInvoiceStats = async (req, res) => {
    try {
        const total = await Invoice.countDocuments();
        const paid = await Invoice.countDocuments({ status: "Paid" });
        const unpaid = await Invoice.countDocuments({ status: "Unpaid" });
        const partial = await Invoice.countDocuments({ status: "Partial" });

        res.status(200).json({ total, paid, unpaid, partial });
    } catch (err) {
        console.error("Error fetching invoice stats:", err);
        res.status(500).json({ message: "Failed to get invoice stats", error: err.message });
    }
};
