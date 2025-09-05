import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import { sendError } from "../utils/errorHandler.js";
import { computeTotals } from "../utils/bookingHelpers.js";
import { BOOKING_STATUS, BOOKING_POPULATE } from "../constants/bookingConstants.js";

/**
 * Validate service IDs against DB
 */
const validateServiceIds = async (serviceIds = [], context = "services") => {
    const validIds = serviceIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const found = await Service.find({ _id: { $in: validIds } });
    const foundSet = new Set(found.map((s) => s._id.toString()));
    const invalid = validIds.filter((id) => !foundSet.has(id));

    if (invalid.length > 0) {
        throw new Error(`Invalid ${context} ID(s): ${invalid.join(", ")}`);
    }
};

/**
 * --- Create Booking ---
 */
export const createBooking = async (req, res) => {
    try {
        const {
            prebookingServices = [],
            services = [],
            upsells = [],
        } = req.body;

        await validateServiceIds(prebookingServices, "prebookingServices");
        await validateServiceIds(services, "services");

        for (let i = 0; i < upsells.length; i++) {
            await validateServiceIds(upsells[i]?.services || [], `upsells[${i}].services`);
        }

        const booking = new Booking({
            ...req.body,
            status: BOOKING_STATUS.PENDING,
            createdBy: req.user?._id,
        });

        await computeTotals(booking);
        await booking.save();

        res.status(201).json({
            success: true,
            message: "Booking Created Successfully"
        });
    } catch (error) {
        console.error("Create Booking Error:", error);
        sendError(res, 400, error.message);
    }
};

/**
 * --- Get All Bookings (with Pagination + Filtering) ---
 */
export const getAllBookings = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 20,
            sortBy = "createdAt",
            sortDir = "desc",
            status,
            vehicleRegNo,
            ownerName,
            ownerPostalCode,
            source,
        } = req.query;

        page = Number(page);
        limit = Number(limit);
        const skip = (page - 1) * limit;
        const sortOrder = sortDir.toLowerCase() === "asc" ? 1 : -1;

        const filter = {};
        if (status) filter.status = status;
        if (vehicleRegNo) filter.vehicleRegNo = { $regex: vehicleRegNo, $options: "i" };
        if (ownerName) filter.ownerName = { $regex: ownerName, $options: "i" };
        if (ownerPostalCode) filter.ownerPostalCode = { $regex: ownerPostalCode, $options: "i" };
        if (source) filter.source = { $regex: source, $options: "i" };

        const [bookings, total] = await Promise.all([
            Booking.find(filter)
                .populate(BOOKING_POPULATE)
                .skip(skip)
                .limit(limit)
                .sort({ [sortBy]: sortOrder }),
            Booking.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: bookings,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get All Bookings Error:", error);
        sendError(res, 500, error.message);
    }
};

/**
 * --- Get Single Booking by ID ---
 */
export const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 400, "Invalid booking ID");
        }

        const booking = await Booking.findById(id).populate(BOOKING_POPULATE);
        if (!booking) return sendError(res, 404, "Booking not found");

        res.json({ success: true, booking });
    } catch (error) {
        console.error("Get Booking Error:", error);
        sendError(res, 500, error.message);
    }
};

/**
 * --- Update Booking (General Details) ---
 */
export const updateBooking = async (req, res) => {
    try {
        const { id } = req.params;

        console.log("DEBUG BODY2:", req.body);
        console.log("DEBUG BODY2:", id);
        // Validate booking ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 400, "Invalid booking ID");
        }

        // Ensure request has a body
        if (!req.body || Object.keys(req.body).length === 0) {
            return sendError(res, 400, "No update fields provided");
        }

        // Find the booking
        let booking = await Booking.findById(id);
        if (!booking) return sendError(res, 404, "Booking not found");

        // Allowed fields to update
        const allowedUpdateFields = [
            "vehicleRegNo",
            "makeModel",
            "ownerName",
            "ownerAddress",
            "ownerPostalCode",
            "ownerNumber",
            "source",
            "scheduledDate",
            "remarks",
            "prebookingLabourCost",
            "prebookingPartsCost",
            "prebookingBookingPrice",
            "prebookingServices",
        ];

        // Validate services if included
        if (req.body.hasOwnProperty("prebookingServices")) {
            await validateServiceIds(req.body.prebookingServices, "prebookingServices");
        }

        // Apply only allowed fields
        for (const key of allowedUpdateFields) {
            if (req.body.hasOwnProperty(key)) {
                booking[key] = req.body[key];
            }
        }

        // Recompute totals if cost-related fields changed
        const costFields = [
            "prebookingServices",
            "prebookingLabourCost",
            "prebookingPartsCost",
            "prebookingBookingPrice",
        ];

        if (Object.keys(req.body).some((field) => costFields.includes(field))) {
            await computeTotals(booking);
        }

        // Save changes
        await booking.save({ runValidators: true });

        // Send success response
        res.json({
            success: true,
            message: `Booking ${booking._id} updated successfully`,
        });

    } catch (error) {
        console.error("Update Booking Error:", error);
        sendError(res, 400, error.message);
    }
};

/**
 * --- Update Booking Status ---
 */
export const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 400, "Invalid booking ID");
        }
        if (!status) return sendError(res, 400, "New status is required");

        let booking = await Booking.findById(id);
        if (!booking) return sendError(res, 404, "Booking not found");

        const allowedTransitions = {
            [BOOKING_STATUS.PENDING]: [BOOKING_STATUS.ARRIVED, BOOKING_STATUS.CANCELLED],
            [BOOKING_STATUS.ARRIVED]: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED],
            [BOOKING_STATUS.COMPLETED]: [],
            [BOOKING_STATUS.CANCELLED]: [],
        };

        if (!allowedTransitions[booking.status].includes(status)) {
            return sendError(res, 400, `Invalid status transition: ${booking.status} → ${status}`);
        }

        booking.status = status;
        booking.updatedBy = req.user?._id;

        const now = new Date();
        switch (status) {
            case BOOKING_STATUS.ARRIVED:
                booking.arrivedAt = now;
                booking.arrivedBy = req.user?._id;
                break;
            case BOOKING_STATUS.COMPLETED:
                booking.completedAt = now;
                booking.completedBy = req.user?._id;
                break;
            case BOOKING_STATUS.CANCELLED:
                booking.cancelledAt = now;
                booking.cancelledBy = req.user?._id;
                break;
        }

        await booking.save({ allowEdit: true });

        const populated = await Booking.findById(booking._id).populate(BOOKING_POPULATE);
        res.json({ success: true, booking: populated });
    } catch (error) {
        console.error("Update Booking Status Error:", error);
        sendError(res, 500, error.message);
    }
};
