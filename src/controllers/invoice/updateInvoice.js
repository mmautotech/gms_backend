// controllers/invoice/updateInvoice.js
import Invoice from "../../models/Invoice.js";
import Booking from "../../models/Booking.js";

/**
 * 🧾 Update Invoice
 * - Syncs booking snapshot
 * - Recalculates totals
 * - Prevents unintended overwrites
 */
export const updateInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const { items, discountAmount = 0, vatIncluded = false, status } = req.body || {};

        if (!invoiceId) {
            return res.status(400).json({
                success: false,
                message: "Invoice ID is required",
            });
        }

        // ✅ Fetch invoice
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found",
            });
        }

        // ✅ Fetch linked booking for updated snapshot
        const booking = await Booking.findById(invoice.booking).lean();
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Linked booking not found",
            });
        }

        // ✅ Update customer snapshot fields
        invoice.customerName = booking.ownerName;
        invoice.contactNo = booking.ownerNumber;
        invoice.vehicleRegNo = booking.vehicleRegNo;
        invoice.makeModel = booking.makeModel;
        invoice.postalCode = booking.ownerPostalCode;

        // Preserve previous landingDate if booking not yet arrived
        invoice.landingDate = booking.arrivedAt || invoice.landingDate || null;

        // ✅ Update items if provided
        if (Array.isArray(items) && items.length > 0) {
            invoice.items = items.map((item) => ({
                description: String(item.description || "").trim(),
                amount: Number(item.amount) || 0,
            }));
        }

        // ✅ Update financial fields
        invoice.discountAmount = Number(discountAmount) || 0;
        invoice.vatIncluded = Boolean(vatIncluded);

        // Validate status before assignment
        const allowedStatuses = ["Received", "Receivable", "Partial"];
        if (status && allowedStatuses.includes(status)) {
            invoice.status = status;
        }

        // ✅ Recalculate totals
        const subtotal = invoice.items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const afterDiscount = subtotal - invoice.discountAmount;
        invoice.totalAmount = invoice.vatIncluded ? afterDiscount * 1.2 : afterDiscount;

        await invoice.save();

        return res.status(200).json({
            success: true,
            message: "Invoice updated successfully",
            invoice,
        });
    } catch (err) {
        console.error("❌ Error updating invoice:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to update invoice",
            error: err.message,
        });
    }
};
