// controllers/supplierController.js
import Supplier from "../models/Supplier.js";

/** Create new supplier */
export const createSupplier = async (req, res) => {
    try {
        let { name, contact, bankAccount, address, email } = req.body;

        // Validate required fields
        if (!name) return res.status(400).json({ error: "Supplier name is required" });
        if (!contact) return res.status(400).json({ error: "Contact is required" });
        if (!bankAccount) return res.status(400).json({ error: "Bank account is required" });

        // Trim and normalize strings
        name = name.trim();
        contact = contact.trim();
        bankAccount = bankAccount.trim();
        address = address?.trim() || null;
        email = email?.trim()?.toLowerCase() || null;

        const supplier = await Supplier.create({ name, contact, bankAccount, address, email });

        res.status(201).json({ message: "Supplier created successfully", supplier });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                error: "Duplicate supplier",
                message: "Supplier with this name already exists"
            });
        }
        res.status(500).json({ error: "Error creating supplier", details: error.message });
    }
};

/** Get all suppliers */
export const getAllSuppliers = async (_req, res) => {
    try {
        const suppliers = await Supplier.find().sort({ createdAt: -1 });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ error: "Error fetching suppliers", details: error.message });
    }
};

/** Get single supplier by ID */
export const getSupplierById = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) return res.status(404).json({ error: "Supplier not found" });

        res.json(supplier);
    } catch (error) {
        res.status(500).json({ error: "Error fetching supplier", details: error.message });
    }
};

/** Update supplier */
export const updateSupplier = async (req, res) => {
    try {
        let { name, contact, bankAccount, address, email } = req.body;

        // Trim and normalize strings
        name = name?.trim();
        contact = contact?.trim();
        bankAccount = bankAccount?.trim();
        address = address?.trim() || null;
        email = email?.trim()?.toLowerCase() || null;

        const supplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            { name, contact, bankAccount, address, email },
            { new: true, runValidators: true }
        );

        if (!supplier) return res.status(404).json({ error: "Supplier not found" });

        res.json({ message: "Supplier updated successfully", supplier });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                error: "Duplicate supplier",
                message: "Supplier with this name already exists"
            });
        }
        res.status(500).json({ error: "Error updating supplier", details: error.message });
    }
};

/** Delete supplier */
export const deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndDelete(req.params.id);
        if (!supplier) return res.status(404).json({ error: "Supplier not found" });

        res.json({ message: "Supplier deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error deleting supplier", details: error.message });
    }
};
