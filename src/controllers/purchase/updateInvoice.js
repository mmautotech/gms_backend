import mongoose from "mongoose";
import PurchaseInvoice from "../../models/PurchaseInvoice.js";
import Booking from "../../models/Booking.js";
import Part from "../../models/Part.js";
import { BOOKING_STATUS } from "../../constants/bookingConstants.js";

export const updatePurchaseInvoice = async (req, res) => {
    try {
        const { booking, items } = req.body;

        let bookingId = null;
        if (booking) {
            if (!mongoose.isValidObjectId(booking)) {
                return res.status(400).json({ success: false, error: "Invalid booking ID" });
            }
            const bookingMatch = await Booking.findOne({
                _id: booking,
                status: BOOKING_STATUS.ARRIVED,
            });
            if (!bookingMatch) {
                return res
                    .status(400)
                    .json({ success: false, error: "Booking must be ARRIVED to link invoice" });
            }
            bookingId = bookingMatch._id;
        }

        // ✅ Validate items if provided
        if (items && Array.isArray(items)) {
            for (let i = 0; i < items.length; i++) {
                const { part, rate, quantity } = items[i];
                if (!part || rate == null || quantity == null) {
                    return res
                        .status(400)
                        .json({ success: false, error: `Item at index ${i} is invalid` });
                }
                if (!mongoose.isValidObjectId(part)) {
                    return res
                        .status(400)
                        .json({ success: false, error: `Invalid Part ID at index ${i}` });
                }
                const partExists = await Part.findById(part);
                if (!partExists || !partExists.isActive) {
                    return res.status(400).json({
                        success: false,
                        error: `Part at index ${i} not found or inactive`,
                    });
                }
            }
        }

        // ❌ Removed duplicate active invoice restriction

        const invoice = await PurchaseInvoice.findByIdAndUpdate(
            req.params.id,
            { ...req.body, ...(bookingId ? { booking: bookingId } : {}) },
            { new: true, runValidators: true }
        );

        if (!invoice) {
            return res.status(404).json({ success: false, error: "Invoice not found" });
        }

        res.json({
            success: true,
            message: "Purchase invoice successfully updated",
            id: invoice._id,
        });
    } catch (err) {
        console.error("Update Invoice Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
