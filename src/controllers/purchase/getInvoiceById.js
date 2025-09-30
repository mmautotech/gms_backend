import PurchaseInvoice from "../../models/PurchaseInvoice.js";

const POPULATE_CONFIG = [
    { path: "supplier", select: "id name contact" },
    { path: "booking", select: "id vehicleRegNo status scheduledDate" },
    { path: "purchaser", select: "id username" },
    { path: "items.part", select: "id partName partNumber price" },
];

export const getPurchaseInvoiceById = async (req, res) => {
    try {
        const filter = { _id: req.params.id, isActive: true };
        if (req.user.userType !== "admin") {
            filter.purchaser = req.user._id;
        }

        const invoice = await PurchaseInvoice.findOne(filter).populate(POPULATE_CONFIG);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: "Invoice not found",
            });
        }

        res.json({
            success: true,
            params: {
                id: req.params.id,
            },
            pagination: null,
            data: [invoice], // ✅ keep array for consistency
        });
    } catch (err) {
        console.error("Get Invoice By ID Error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};
