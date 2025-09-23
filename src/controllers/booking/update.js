import mongoose from "mongoose";
import Booking from "../../models/Booking.js";
import { sendError } from "../../utils/errorHandler.js";
import { computeTotals } from "../../utils/bookingHelpers.js";

const validateServiceIds = async (serviceIds = [], context = "services") => {
    const validIds = serviceIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const found = await Booking.db.model("Service").find({ _id: { $in: validIds } });
    const foundSet = new Set(found.map((s) => s._id.toString()));
    const invalid = validIds.filter((id) => !foundSet.has(id));
    if (invalid.length > 0) throw new Error(`Invalid ${context} ID(s): ${invalid.join(", ")}`);
};

export const updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 400, "Invalid booking ID");
        }
        if (!req.body || Object.keys(req.body).length === 0) {
            return sendError(res, 400, "No update fields provided");
        }

        let booking = await Booking.findById(id);
        if (!booking) return sendError(res, 404, "Booking not found");

        const allowedUpdateFields = [
            "vehicleRegNo",
            "makeModel",
            "ownerName",
            "ownerAddress",
            "ownerPostalCode",
            "ownerNumber",
            "ownerEmail",
            "bookingConfirmationPhoto",
            "source",
            "scheduledDate",
            "remarks",
            "prebookingLabourCost",
            "prebookingPartsCost",
            "prebookingBookingPrice",
            "prebookingServices",
        ];

        if (req.body.hasOwnProperty("prebookingServices")) {
            await validateServiceIds(req.body.prebookingServices, "prebookingServices");
        }

        for (const key of allowedUpdateFields) {
            if (req.body.hasOwnProperty(key)) booking[key] = req.body[key];
        }

        booking.updatedBy = req.user?._id;

        const costFields = [
            "prebookingServices",
            "prebookingLabourCost",
            "prebookingPartsCost",
            "prebookingBookingPrice",
        ];
        if (Object.keys(req.body).some((field) => costFields.includes(field))) {
            await computeTotals(booking);
        }

        await booking.save({ runValidators: true });

        res.json({
            success: true,
            message: `Booking ${booking._id} updated successfully`,
            booking,
        });
    } catch (error) {
        console.error("Update Booking Error:", error);
        sendError(res, 400, error.message);
    }
};
