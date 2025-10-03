import Part from "../models/Part.js";
import Service from "../models/Service.js";
import Booking from "../models/Booking.js";

const handleError = (error, res) => {
    if (error.code === 11000) {
        return res.status(400).json({
            success: false,
            error: "A part with this name already exists",
        });
    }
    return res.status(500).json({ success: false, error: error.message });
};

// ✅ Create part
export const createPart = async (req, res) => {
    try {
        const { partName } = req.body;
        const part = await Part.create({ partName });
        return res.status(201).json({ success: true, data: part });
    } catch (error) {
        return handleError(error, res);
    }
};

// ✅ Get all parts
export const getParts = async (req, res) => {
    try {
        const { q } = req.query;
        const parts = await Part.find().lean();
        return res.json({ success: true, data: parts });
    } catch (error) {
        return handleError(error, res);
    }
};

// ✅ Get part by ID
export const getPartById = async (req, res) => {
    try {
        const part = await Part.findById(req.params.id).lean();
        if (!part) return res.status(404).json({ success: false, error: "Part not found" });
        return res.json({ success: true, data: part });
    } catch (error) {
        return handleError(error, res);
    }
};

// ✅ Update part
export const updatePart = async (req, res) => {
    try {
        const { partName } = req.body;

        const part = await Part.findByIdAndUpdate(
            req.params.id,
            { partName },
            { new: true, runValidators: true }
        ).lean();

        if (!part) return res.status(404).json({ success: false, error: "Part not found" });

        return res.json({ success: true, data: part });
    } catch (error) {
        return handleError(error, res);
    }
};

// ✅ Soft delete (deactivate)
export const deactivatePart = async (req, res) => {
    try {
        const part = await Part.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );
        if (!part) return res.status(404).json({ success: false, error: "Part not found" });

        return res.json({
            success: true,
            message: "Part deactivated",
            data: part,
        });
    } catch (error) {
        return handleError(error, res);
    }
};

// ✅ Reactivate
export const activatePart = async (req, res) => {
    try {
        const part = await Part.findByIdAndUpdate(
            req.params.id,
            { isActive: true },
            { new: true }
        );
        if (!part) return res.status(404).json({ success: false, error: "Part not found" });

        return res.json({
            success: true,
            message: "Part reactivated",
            data: part,
        });
    } catch (error) {
        return handleError(error, res);
    }
};

// ✅ Dropdown (active parts only)
export const getPartsDropdown = async (req, res) => {
    try {
        const parts = await Part.find({ isActive: true }).select("partName").sort({ partName: 1 }).lean();

        const mapped = parts.map((p) => ({
            id: p._id,
            label: p.partName,
        }));

        return res.json({ success: true, data: mapped });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// ✅ Parts for a booking (active only)
export const getPartsByBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId).select("services").lean();
        if (!booking) {
            return res.status(404).json({ success: false, error: "Booking not found" });
        }

        if (!booking.services || booking.services.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // find services with active parts only
        const services = await Service.find({ _id: { $in: booking.services } })
            .populate({
                path: "parts",
                match: { isActive: true },
                select: "partName isActive",
            })
            .lean();

        const uniqueParts = new Map();
        services.forEach((s) => {
            s.parts.forEach((p) => {
                if (!uniqueParts.has(p._id.toString())) {
                    uniqueParts.set(p._id.toString(), p);
                }
            });
        });

        const mapped = [...uniqueParts.values()].map((p) => ({
            id: p._id,
            label: p.partName,
        }));

        return res.json({ success: true, data: mapped });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
