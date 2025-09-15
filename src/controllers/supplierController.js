// controllers/supplierController.js
import Supplier from "../models/Supplier.js";

// ✅ Create supplier
export const createSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.create(req.body);
        res.status(201).json(supplier);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Get all suppliers
export const getSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.find().lean();
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Get supplier by ID
export const getSupplierById = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id).lean();
        if (!supplier) return res.status(404).json({ message: "Supplier not found" });
        res.json(supplier);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Update supplier
export const updateSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        }).lean();

        if (!supplier) return res.status(404).json({ message: "Supplier not found" });

        res.json(supplier);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Delete supplier
export const deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndDelete(req.params.id);
        if (!supplier) return res.status(404).json({ message: "Supplier not found" });
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
