import Invoice from "../../models/Invoice.js";
import Booking from "../../models/Booking.js";

// ✅ Auto-generate invoice number
const generateInvoiceNo = async () => {
    const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
    if (!lastInvoice || !lastInvoice.invoiceNo) return "INV-0001";

    const parts = lastInvoice.invoiceNo.split("-");
    const lastNo = parseInt(parts[1], 10) || 0;
    const nextNo = (lastNo + 1).toString().padStart(4, "0");
    return `INV-${nextNo}`;
};

/**
 * 🧾 Generate (or Regenerate) Invoice by Booking ID
 */
export const generateInvoiceByBookingId = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { createdBy, discountAmount = 0, vatIncluded = false, status = "Unpaid" } = req.body || {};

        if (!bookingId) return res.status(400).json({ message: "Booking ID is required" });

        const booking = await Booking.findById(bookingId)
            .populate("prebookingServices", "name")
            .populate("upsells.services", "name")
            .lean();

        if (!booking) return res.status(404).json({ message: "Booking not found" });

        // Build invoice items
        const items = [];
        booking.prebookingServices?.forEach((s, i) => {
            items.push({
                description: `Prebooking ${i + 1} - ${s.name}`,
                amount: i === 0 ? Number(booking.prebookingBookingPrice || 0) : 0,
            });
        });

        booking.upsells?.forEach((u, i) => {
            u.services?.forEach((s) => {
                items.push({
                    description: `Upsell ${i + 1} - ${s.name}`,
                    amount: Number(u.upsellPrice || 0),
                });
            });
        });

        // Totals
        const subtotal = items.reduce((sum, i) => sum + Number(i.amount || 0), 0);
        const afterDiscount = subtotal - Number(discountAmount);
        const finalTotal = vatIncluded ? afterDiscount * 1.2 : afterDiscount;

        // Check for existing invoice
        let invoice = await Invoice.findOne({ booking: booking._id });
        if (invoice) {
            Object.assign(invoice, {
                customerName: booking.ownerName,
                contactNo: booking.ownerNumber,
                vehicleRegNo: booking.vehicleRegNo,
                makeModel: booking.makeModel,
                postalCode: booking.ownerPostalCode,
                invoiceDate: new Date(),
                items,
                discountAmount,
                vatIncluded,
                status,
                totalAmount: finalTotal,
                createdBy: createdBy || booking.createdBy,
            });
            await invoice.save();
            return res.status(200).json(invoice);
        }

        const invoiceNo = await generateInvoiceNo();
        invoice = await Invoice.create({
            booking: booking._id,
            invoiceNo,
            customerName: booking.ownerName,
            contactNo: booking.ownerNumber,
            vehicleRegNo: booking.vehicleRegNo,
            makeModel: booking.makeModel,
            postalCode: booking.ownerPostalCode,
            invoiceDate: new Date(),
            items,
            discountAmount,
            vatIncluded,
            status,
            totalAmount: finalTotal,
            createdBy: createdBy || booking.createdBy,
        });

        res.status(201).json(invoice);
    } catch (err) {
        console.error("Generate invoice error:", err);
        res.status(500).json({ message: "Failed to generate invoice", error: err.message });
    }
};
