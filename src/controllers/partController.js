// controllers/partsController.js
import Part from "../models/Part.js";
import Supplier from "../models/Supplier.js";

// ✅ Create part
export const createPart = async (req, res) => {
    try {
        const { supplier } = req.body;
        const supplierExists = await Supplier.findById(supplier);

        if (!supplierExists) {
            return res.status(400).json({ message: "Supplier not found" });
        }

        const part = await Part.create(req.body);
        res.status(201).json(part);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Get all parts
export const getParts = async (req, res) => {
    try {
        const { q } = req.query;
        const filter = q ? { $text: { $search: q } } : {};

        const parts = await Part.find(filter)
            .populate("supplier", "name contact email")
            .lean();

        res.json(parts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Get part by ID
export const getPartById = async (req, res) => {
    try {
        const part = await Part.findById(req.params.id)
            .populate("supplier", "name contact email")
            .lean();

        if (!part) return res.status(404).json({ message: "Part not found" });

        res.json(part);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Update part
export const updatePart = async (req, res) => {
    try {
        const part = await Part.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        }).lean();

        if (!part) return res.status(404).json({ message: "Part not found" });

        res.json(part);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Delete part
export const deletePart = async (req, res) => {
    try {
        const part = await Part.findByIdAndDelete(req.params.id);
        if (!part) return res.status(404).json({ message: "Part not found" });
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Restock part
export const restockPart = async (req, res) => {
    try {
        const { quantity } = req.body;

        const part = await Part.findByIdAndUpdate(
            req.params.id,
            {
                $inc: { currentStock: Number(quantity) },
                lastRestocked: new Date(),
            },
            { new: true }
        ).lean();

        if (!part) return res.status(404).json({ message: "Part not found" });

        res.json(part);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
