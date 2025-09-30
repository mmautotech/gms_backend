import PurchaseInvoice from "../../models/PurchaseInvoice.js";

export const deletePurchaseInvoice = async (req, res) => {
    try {
        const invoice = await PurchaseInvoice.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!invoice) {
            return res.status(404).json({ success: false, error: "Invoice not found" });
        }

        res.json({
            success: true,
            message: "Purchase invoice successfully deactivated",
            id: invoice._id,
        });
    } catch (err) {
        console.error("Delete Invoice Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
