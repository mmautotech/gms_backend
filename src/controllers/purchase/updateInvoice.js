import mongoose from "mongoose";
import PurchaseInvoice from "../../models/PurchaseInvoice.js";
import Part from "../../models/Part.js";
import Supplier from "../../models/Supplier.js";

export const updatePurchaseInvoice = async (req, res) => {
    try {
        const { supplier, booking, items } = req.body;

        // ❌ Prevent booking change
        if (booking) {
            return res.status(400).json({
                success: false,
                error: "Booking cannot be changed once invoice is created"
            });
        }

        // ✅ Validate supplier if provided
        if (supplier) {
            if (!mongoose.isValidObjectId(supplier)) {
                return res.status(400).json({ success: false, error: "Invalid supplier ID" });
            }
            const supplierExists = await Supplier.findById(supplier);
            if (!supplierExists) {
                return res.status(400).json({ success: false, error: "Supplier not found" });
            }
        }

        // ✅ Validate items if provided
        if (items && Array.isArray(items)) {
            for (let i = 0; i < items.length; i++) {
                const { part, rate, quantity } = items[i];
                if (!part || rate == null || quantity == null) {
                    return res.status(400).json({ success: false, error: `Item at index ${i} is invalid` });
                }
                if (!mongoose.isValidObjectId(part)) {
                    return res.status(400).json({ success: false, error: `Invalid Part ID at index ${i}` });
                }
                const partExists = await Part.findById(part);
                if (!partExists || !partExists.isActive) {
                    return res.status(400).json({
                        success: false,
                        error: `Part at index ${i} not found or inactive`,
                    });
                }
            }
        }

        // ✅ Update allowed fields
        const invoice = await PurchaseInvoice.findByIdAndUpdate(
            req.params.id,
            { ...req.body },
            { new: true, runValidators: true }
        );

        if (!invoice) {
            return res.status(404).json({ success: false, error: "Invoice not found" });
        }

        res.json({
            success: true,
            message: "Purchase invoice successfully updated",
            id: invoice._id,
        });
    } catch (err) {
        console.error("Update Invoice Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
