// controllers/partsController.js
import Part from "../models/Part.js";
import Supplier from "../models/Supplier.js";

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
        const { supplier, partName, partNumber } = req.body;

        // Ensure supplier exists
        const supplierExists = await Supplier.findById(supplier);
        if (!supplierExists) {
            return res.status(400).json({ success: false, error: "Supplier not found" });
        }

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
            // includeInactive=true → no filter → admin sees all
        } else {
            filter.isActive = true; // normal users only see active
        }

        const [parts, total, activeCount, inactiveCount] = await Promise.all([
            Part.find(filter).populate("supplier", "name contact email").lean(),
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
 * ✅ Get part by ID (independent of status)
 */
export const getPartById = async (req, res) => {
    try {
        const part = await Part.findById(req.params.id)
            .populate("supplier", "name contact email")
            .lean();

        if (!part) {
            return res.status(404).json({ success: false, error: "Part not found" });
        }

        return res.json({ success: true, data: part });
    } catch (error) {
        return handleError(error, res);
    }
};

/**
 * ✅ Update part (independent of status)
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
        })
            .populate("supplier", "name contact email")
            .lean();

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
 * ✅ Restore (activate)
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
