// controllers/invoices/getInvoiceByBookingId.js
import mongoose from "mongoose";
import Invoice from "../../models/Invoice.js";

/**
 * 📌 Get Invoice by Booking ID (fetch only)
 * - Returns exists=false if invoice not found
 * - Populates createdBy.username
 */
export const getInvoiceByBookingId = async (req, res) => {
    try {
        const { bookingId } = req.params;
        if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid Booking ID is required",
            });
        }

        const invoice = await Invoice.findOne({ booking: bookingId })
            .populate("createdBy", "username userType")
            .select(
                "invoiceNo booking customerName contactNo postalCode vehicleRegNo makeModel landingDate items totalAmount discountAmount vatIncluded status createdBy createdAt updatedAt"
            )
            .lean();

        if (!invoice) {
            return res.status(200).json({
                success: true,
                exists: false,
                message: "No invoice found for this booking",
                invoice: null,
            });
        }

        // ✅ Flatten createdBy safely
        const creator =
            invoice.createdBy && typeof invoice.createdBy === "object"
                ? invoice.createdBy.username
                : invoice.createdBy || null;

        const formattedInvoice = {
            ...invoice,
            createdBy: creator,
        };

        return res.status(200).json({
            success: true,
            exists: true,
            message: "Invoice fetched successfully",
            invoice: formattedInvoice,
        });
    } catch (err) {
        console.error("❌ Get invoice error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch invoice",
            error: err.message,
        });
    }
};
