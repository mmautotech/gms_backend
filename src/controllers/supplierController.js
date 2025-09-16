import Supplier from "../models/Supplier.js";

// Helper: handle duplicate key error
const handleDuplicateKeyError = (err, res) => {
    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            error: "Duplicate supplier field",
            details: err.keyValue,
        });
    }
    res.status(500).json({ success: false, error: err.message });
};

// ✅ Create supplier
export const createSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.create(req.body);
        res.status(201).json({ success: true, data: supplier });
    } catch (err) {
        handleDuplicateKeyError(err, res);
    }
};


// ✅ Get all suppliers (with meta counts)
export const getSuppliers = async (req, res) => {
    try {
        const { includeInactive } = req.query;

        let filter = { isActive: true };

        // Admins can fetch inactive suppliers
        if (includeInactive && req.user?.userType === "admin") {
            filter = {}; // fetch all
        }

        const [suppliers, total, activeCount, inactiveCount] = await Promise.all([
            Supplier.find(filter).lean(),
            Supplier.countDocuments(),
            Supplier.countDocuments({ isActive: true }),
            Supplier.countDocuments({ isActive: false }),
        ]);

        res.json({
            success: true,
            data: suppliers,
            meta: {
                totalSuppliers: total,
                activeSuppliers: activeCount,
                inactiveSuppliers: inactiveCount,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// ✅ Get supplier by ID
export const getSupplierById = async (req, res) => {
    try {
        const filter = { _id: req.params.id };
        if (req.user?.userType !== "admin") filter.isActive = true;

        const supplier = await Supplier.findOne(filter).lean();
        if (!supplier) {
            return res.status(404).json({ success: false, error: "Supplier not found" });
        }

        res.json({ success: true, data: supplier });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ✅ Update supplier
export const updateSupplier = async (req, res) => {
    try {
        const filter = { _id: req.params.id };
        if (req.user?.userType !== "admin") filter.isActive = true;

        const supplier = await Supplier.findOneAndUpdate(filter, req.body, {
            new: true,
            runValidators: true,
        }).lean();

        if (!supplier) {
            return res.status(404).json({ success: false, error: "Supplier not found" });
        }

        res.json({ success: true, data: supplier });
    } catch (err) {
        handleDuplicateKeyError(err, res);
    }
};

// ✅ Soft delete supplier
export const deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!supplier) {
            return res.status(404).json({ success: false, error: "Supplier not found" });
        }

        res.json({ success: true, message: "Supplier deactivated", data: supplier });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ✅ Restore supplier
export const restoreSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            { isActive: true },
            { new: true }
        );

        if (!supplier) {
            return res.status(404).json({ success: false, error: "Supplier not found" });
        }

        res.json({ success: true, message: "Supplier restored", data: supplier });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
