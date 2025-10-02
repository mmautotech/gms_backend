// controllers/partsController.js
import Part from "../models/Part.js";
import Service from "../models/Service.js";
import Booking from "../models/Booking.js";

const handleError = (error, res) => {
    if (error.code === 11000) {
        const keys = Object.keys(error.keyValue);
        return res.status(400).json({
            success: false,
            error: `Duplicate value for fields: ${keys.join(", ")}.`,
            details: error.keyValue,
        });
    }
    return res.status(500).json({ success: false, error: error.message });
};

const checkDuplicate = async (partName, partNumber, excludeId = null) => {
    const query = { partName: partName?.trim(), partNumber: partNumber ?? null };
    if (excludeId) query._id = { $ne: excludeId };
    return Part.findOne(query);
};

// ✅ Create part
export const createPart = async (req, res) => {
    try {
        const { partName, partNumber, description } = req.body;

        if (await checkDuplicate(partName, partNumber)) {
            return res.status(400).json({
                success: false,
                error: "A part with this name and number already exists",
            });
        }

        const part = await Part.create({ partName, partNumber, description });
        return res.status(201).json({ success: true, data: part });
    } catch (error) {
        return handleError(error, res);
    }
};

// ✅ Get all ACTIVE parts
export const getParts = async (req, res) => {
    try {
        const { q } = req.query;
        const filter = { isActive: true };

        if (q) filter.$text = { $search: q };

        const parts = await Part.find(filter).lean();
        return res.json({ success: true, data: parts });
    } catch (error) {
        return handleError(error, res);
    }
};

// ✅ Get part by ID (active + inactive, for admin view)
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
        const { partName, partNumber, description } = req.body;

        if (partName || partNumber !== undefined) {
            if (await checkDuplicate(partName, partNumber, req.params.id)) {
                return res.status(400).json({
                    success: false,
                    error: "A part with this name and number already exists",
                });
            }
        }

        const part = await Part.findByIdAndUpdate(
            req.params.id,
            { partName, partNumber, description },
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
        const parts = await Part.find({ isActive: true })
            .select("partName partNumber")
            .sort({ partName: 1 })
            .lean();

        const mapped = parts.map((p) => ({
            id: p._id,
            label: p.partNumber ? `${p.partName} (${p.partNumber})` : p.partName,
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
                select: "partName partNumber isActive",
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
            label: p.partNumber ? `${p.partName} (${p.partNumber})` : p.partName,
        }));

        return res.json({ success: true, data: mapped });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
