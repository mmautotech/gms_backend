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

// ✅ Get all suppliers (active by default, admins can request inactive too)
export const getSuppliers = async (req, res) => {
    try {
        const { includeInactive } = req.query;

        let filter = { isActive: true };

        // Only admins can request inactive suppliers
        if (includeInactive && req.user?.userType === "admin") {
            filter = {}; // fetch all suppliers
        }

        const suppliers = await Supplier.find(filter).lean();
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Get supplier by ID (active only for non-admins)
export const getSupplierById = async (req, res) => {
    try {
        const filter = { _id: req.params.id };

        // Non-admins can only see active suppliers
        if (req.user?.userType !== "admin") {
            filter.isActive = true;
        }

        const supplier = await Supplier.findOne(filter).lean();

        if (!supplier) return res.status(404).json({ message: "Supplier not found" });
        res.json(supplier);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Update supplier (only if active, unless admin)
export const updateSupplier = async (req, res) => {
    try {
        const filter = { _id: req.params.id };

        // Non-admins should not be able to update inactive suppliers
        if (req.user?.userType !== "admin") {
            filter.isActive = true;
        }

        const supplier = await Supplier.findOneAndUpdate(filter, req.body, {
            new: true,
            runValidators: true,
        }).lean();

        if (!supplier) return res.status(404).json({ message: "Supplier not found" });
        res.json(supplier);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Soft delete supplier (admin only)
export const deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!supplier) return res.status(404).json({ message: "Supplier not found" });
        res.status(200).json({ message: "Supplier deactivated successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Restore supplier (admin only)
export const restoreSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            { isActive: true },
            { new: true }
        );

        if (!supplier) return res.status(404).json({ message: "Supplier not found" });
        res
            .status(200)
            .json({ message: "Supplier restored successfully", supplier });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
