import PurchaseInvoice from "../../models/PurchaseInvoice.js";

export const updateMyInvoiceStatus = async (req, res) => {
    try {
        const { paymentStatus } = req.body;
        if (!paymentStatus || !["Paid", "Partial", "Unpaid"].includes(paymentStatus)) {
            return res.status(400).json({ success: false, error: "Valid payment status required" });
        }

        const invoice = await PurchaseInvoice.findOne({
            _id: req.params.id,
            purchaser: req.user._id,
            isActive: true,
        });

        if (!invoice) {
            return res.status(404).json({ success: false, error: "Invoice not found" });
        }

        const allowedTransitions = {
            Unpaid: ["Partial", "Paid"],
            Partial: ["Paid"],
            Paid: [],
        };

        if (!allowedTransitions[invoice.paymentStatus].includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                error: `Invalid transition from ${invoice.paymentStatus} to ${paymentStatus}`,
            });
        }

        invoice.paymentStatus = paymentStatus;
        await invoice.save();

        res.json({
            success: true,
            message: `Invoice status updated to ${paymentStatus}`,
            id: invoice._id,
        });
    } catch (err) {
        console.error("Update My Invoice Status Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
