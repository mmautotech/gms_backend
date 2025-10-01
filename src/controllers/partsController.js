import Part from "../models/Part.js";

/**
 * Centralized error handler
 */
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

/**
 * Check uniqueness of partName + partNumber
 */
const checkDuplicate = async (partName, partNumber, excludeId = null) => {
    const query = {
        partName: partName?.trim(),
        partNumber: partNumber ?? null,
    };
    if (excludeId) query._id = { $ne: excludeId };
    return Part.findOne(query);
};

/**
 * ✅ Create part
 */
export const createPart = async (req, res) => {
    try {
        const { partName, partNumber } = req.body;

        // Check duplicate
        if (await checkDuplicate(partName, partNumber)) {
            return res.status(400).json({
                success: false,
                error: "A part with this name and number already exists",
            });
        }

        const part = await Part.create(req.body);
        return res.status(201).json({ success: true, data: part });
    } catch (error) {
        return handleError(error, res);
    }
};

/**
 * ✅ Get all parts
 */
export const getParts = async (req, res) => {
    try {
        const { q, includeInactive, onlyInactive } = req.query;
        const filter = q ? { $text: { $search: q } } : {};

        if (req.user?.userType === "admin") {
            if (onlyInactive) {
                filter.isActive = false;
            } else if (!includeInactive) {
                filter.isActive = true;
            }
        } else {
            filter.isActive = true; // normal users only see active
        }

        const [parts, total, activeCount, inactiveCount] = await Promise.all([
            Part.find(filter).lean(),
            Part.countDocuments(),
            Part.countDocuments({ isActive: true }),
            Part.countDocuments({ isActive: false }),
        ]);

        return res.json({
            success: true,
            data: parts,
            meta: {
                totalParts: total,
                activeParts: activeCount,
                inactiveParts: inactiveCount,
            },
        });
    } catch (error) {
        return handleError(error, res);
    }
};

/**
 * ✅ Get part by ID
 */
export const getPartById = async (req, res) => {
    try {
        const part = await Part.findById(req.params.id).lean();

        if (!part) {
            return res.status(404).json({ success: false, error: "Part not found" });
        }

        return res.json({ success: true, data: part });
    } catch (error) {
        return handleError(error, res);
    }
};

/**
 * ✅ Update part
 */
export const updatePart = async (req, res) => {
    try {
        const { partName, partNumber } = req.body;

        if (partName || partNumber !== undefined) {
            if (await checkDuplicate(partName, partNumber, req.params.id)) {
                return res.status(400).json({
                    success: false,
                    error: "A part with this name and number already exists",
                });
            }
        }

        const part = await Part.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        }).lean();

        if (!part) {
            return res.status(404).json({ success: false, error: "Part not found" });
        }

        return res.json({ success: true, data: part });
    } catch (error) {
        return handleError(error, res);
    }
};

/**
 * ✅ Soft delete (deactivate)
 */
export const deactivatePart = async (req, res) => {
    try {
        const part = await Part.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!part) {
            return res.status(404).json({ success: false, error: "Part not found" });
        }

        return res.json({
            success: true,
            message: "Part deactivated",
            data: part,
        });
    } catch (error) {
        return handleError(error, res);
    }
};

/**
 * ✅ Reactivate
 */
export const activatePart = async (req, res) => {
    try {
        const part = await Part.findByIdAndUpdate(
            req.params.id,
            { isActive: true },
            { new: true }
        );

        if (!part) {
            return res.status(404).json({ success: false, error: "Part not found" });
        }

        return res.json({
            success: true,
            message: "Part reactivated",
            data: part,
        });
    } catch (error) {
        return handleError(error, res);
    }
};

/**
 * ✅ Dropdown mapping (id + label)
 */
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
