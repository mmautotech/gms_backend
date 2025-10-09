import Invoice from "../../models/Invoice.js";
import Booking from "../../models/Booking.js";

/**
 * 🧾 Update Invoice
 */
export const updateInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const { items, discountAmount = 0, vatIncluded = false, status } = req.body || {};
        if (!invoiceId) return res.status(400).json({ message: "Invoice ID is required" });

        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });

        const booking = await Booking.findById(invoice.booking).lean();
        if (!booking) return res.status(404).json({ message: "Linked booking not found" });

        invoice.customerName = booking.ownerName;
        invoice.contactNo = booking.ownerNumber;
        invoice.vehicleRegNo = booking.vehicleRegNo;
        invoice.makeModel = booking.makeModel;
        invoice.postalCode = booking.ownerPostalCode;

        if (Array.isArray(items)) {
            invoice.items = items.map((item) => ({
                description: item.description,
                amount: Number(item.amount || 0),
            }));
        }

        invoice.discountAmount = Number(discountAmount);
        invoice.vatIncluded = vatIncluded;
        if (status) invoice.status = status;

        const subtotal = invoice.items.reduce((sum, i) => sum + Number(i.amount || 0), 0);
        const afterDiscount = subtotal - invoice.discountAmount;
        invoice.totalAmount = vatIncluded ? afterDiscount * 1.2 : afterDiscount;

        await invoice.save();
        res.status(200).json(invoice);
    } catch (err) {
        console.error("Error updating invoice:", err);
        res.status(500).json({ message: "Failed to update invoice", error: err.message });
    }
};
