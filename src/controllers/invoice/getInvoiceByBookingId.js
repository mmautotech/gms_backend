import Invoice from "../../models/Invoice.js";
import { generateInvoiceByBookingId } from "./generateInvoiceByBookingId.js";

/**
 * 📌 Get or Auto-Generate Invoice by Booking ID
 */
export const getInvoiceByBookingId = async (req, res) => {
    try {
        const { bookingId } = req.params;
        if (!bookingId) return res.status(400).json({ message: "Booking ID is required" });

        const invoice = await Invoice.findOne({ booking: bookingId }).lean();
        if (invoice) return res.status(200).json(invoice);

        // If not found, auto-generate it
        return await generateInvoiceByBookingId(req, res);
    } catch (err) {
        console.error("Get invoice error:", err);
        res.status(500).json({ message: "Failed to fetch invoice", error: err.message });
    }
};
