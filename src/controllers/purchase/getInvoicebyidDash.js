// src/controllers/invoiceController.js
import PurchaseInvoice from "../../models/PurchaseInvoice.js";
import Part from "../../models/Part.js";

export const getInvoicebyidDash = async (req, res) => {
    try {
        const { bookingId } = req.params;
        if (!bookingId) {
            return res.status(400).json({ message: "Booking ID is required" });
        }

        // Fetch invoices with supplier info
        const invoices = await PurchaseInvoice.find({ booking: bookingId })
            .populate("supplier", "name")
            .lean();

        // Collect all unique part IDs from all invoices
        const partIds = invoices.flatMap(inv => inv.items.map(item => item.part._id));

        // Fetch all parts in a single query
        const parts = await Part.find({ _id: { $in: partIds } })
            .select("partName partNumber") // fetch only needed fields
            .lean();

        // Map part IDs to part objects for fast lookup
        const partMap = parts.reduce((acc, part) => {
            acc[part._id.toString()] = part;
            return acc;
        }, {});

        // Replace item.part with full part info
        const invoicesWithParts = invoices.map(inv => ({
            ...inv,
            items: inv.items.map(item => ({
                ...item,
                part: partMap[item.part._id.toString()] || { _id: item.part._id, partName: "Unknown Part" },
            })),
        }));

        return res.json(invoicesWithParts);
    } catch (err) {
        console.error("Error fetching invoices for dashboard:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
