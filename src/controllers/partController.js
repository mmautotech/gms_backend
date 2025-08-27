// controllers/partController.js
import Part from "../models/Part.js";

/**
 * Create a new part
 */
export const createPart = async (req, res) => {
    try {
        const { partName, partNumber } = req.body;
        if (!partName) return res.status(400).json({ error: "Part name is required" });

        const part = new Part({
            partName: partName.trim(),
            partNumber: partNumber?.trim() || null,
            createdBy: req.user.id, // from auth middleware
        });

        await part.save();
        res.status(201).json(part);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                error: "Duplicate part entry",
                message: "Part with same name or same name+number already exists"
            });
        }
        res.status(500).json({ error: "Error creating part", details: error.message });
    }
};

/**
 * Get all parts
 */
export const getAllParts = async (_req, res) => {
    try {
        const parts = await Part.find()
            .populate("createdBy", "username userType") // show who created
            .sort({ createdAt: -1 });
        res.json(parts);
    } catch (error) {
        res.status(500).json({ error: "Error fetching parts", details: error.message });
    }
};

/**
 * Get part by ID
 */
export const getPartById = async (req, res) => {
    try {
        const { id } = req.params;
        const part = await Part.findById(id).populate("createdBy", "username userType");

        if (!part) return res.status(404).json({ error: "Part not found" });

        res.json(part);
    } catch (error) {
        res.status(500).json({ error: "Error fetching part", details: error.message });
    }
};

/**
 * Update a part
 */
export const updatePart = async (req, res) => {
    try {
        const { id } = req.params;
        const { partName, partNumber } = req.body;

        const part = await Part.findById(id);
        if (!part) return res.status(404).json({ error: "Part not found" });

        if (partName !== undefined) part.partName = partName.trim();
        if (partNumber !== undefined) part.partNumber = partNumber?.trim() || null;

        await part.save();
        res.json(part);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                error: "Duplicate part entry",
                message: "Part with same name or same name+number already exists"
            });
        }
        res.status(500).json({ error: "Error updating part", details: error.message });
    }
};

/**
 * Delete a part
 */
export const deletePart = async (req, res) => {
    try {
        const { id } = req.params;
        const part = await Part.findByIdAndDelete(id);
        if (!part) return res.status(404).json({ error: "Part not found" });

        res.json({ message: "Part deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error deleting part", details: error.message });
    }
};
