import mongoose from "mongoose";
import PurchaseInvoice from "../../models/PurchaseInvoice.js";
import Supplier from "../../models/Supplier.js";
import Booking from "../../models/Booking.js";
import Part from "../../models/Part.js";
import { BOOKING_STATUS } from "../../constants/bookingConstants.js";

const POPULATE_CONFIG = [
    { path: "supplier", select: "id name contact" },
    { path: "booking", select: "id vehicleRegNo status scheduledDate" },
    { path: "purchaser", select: "id username" },
    { path: "items.part", select: "id partName partNumber price" },
];

export const createPurchaseInvoice = async (req, res) => {
    try {
        const {
            supplier,
            booking,
            items,
            paymentDate,
            paymentStatus,
            discount,
            vatIncluded,
            vendorInvoiceNumber,
            vendorInvoicePhoto,
        } = req.body;

        // ✅ Validate booking ID
        if (!mongoose.isValidObjectId(booking)) {
            return res.status(400).json({ success: false, error: "Invalid booking ID" });
        }

        // ✅ Supplier check
        const supplierExists = await Supplier.findById(supplier);
        if (!supplierExists) {
            return res.status(400).json({ success: false, error: "Supplier not found" });
        }

        // ✅ Booking must exist and be ARRIVED
        const bookingMatch = await Booking.findOne({
            _id: booking,
            status: BOOKING_STATUS.ARRIVED,
        });
        if (!bookingMatch) {
            return res.status(400).json({
                success: false,
                error: "No ARRIVED booking found for this booking ID",
            });
        }

        // ✅ Validate parts
        for (let i = 0; i < items.length; i++) {
            const { part } = items[i];
            if (!mongoose.isValidObjectId(part)) {
                return res
                    .status(400)
                    .json({ success: false, error: `Invalid Part ID at index ${i}` });
            }
            const partExists = await Part.findById(part);
            if (!partExists || !partExists.isActive) {
                return res
                    .status(400)
                    .json({ success: false, error: `Part at index ${i} not found or inactive` });
            }
        }

        // ✅ Create invoice (no duplicate check anymore)
        const invoice = await PurchaseInvoice.create({
            purchaser: req.user._id,
            supplier,
            booking: bookingMatch._id,
            items,
            isActive: true,
            paymentDate,
            paymentStatus,
            discount: Number(discount) || 0,
            vatIncluded: vatIncluded ?? true,
            vendorInvoiceNumber,
            vendorInvoicePhoto: vendorInvoicePhoto || null,
        });

        const populatedInvoice = await PurchaseInvoice.findById(invoice._id).populate(
            POPULATE_CONFIG
        );

        res.status(201).json({
            success: true,
            message: "Purchase invoice successfully created",
            id: populatedInvoice._id,
        });
    } catch (err) {
        console.error("Create Purchase Invoice Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
