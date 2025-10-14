// controllers/invoice/generateInvoiceByBookingId.js
import Invoice from "../../models/Invoice.js";
import Booking from "../../models/Booking.js";

/**
 * ✅ Generate invoice number in format DDMMYY-ABC
 * e.g. 081010-001
 */
const generateInvoiceNo = async () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = String(today.getFullYear()).slice(-2);
    const datePart = `${day}${month}${year}`;

    const lastInvoice = await Invoice.findOne({
        invoiceNo: { $regex: `^${datePart}-` },
    })
        .sort({ createdAt: -1 })
        .lean();

    let seq = 1;
    if (lastInvoice?.invoiceNo) {
        const parts = lastInvoice.invoiceNo.split("-");
        const lastSeq = parseInt(parts[1], 10);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${datePart}-${seq.toString().padStart(3, "0")}`;
};

/**
 * 🧾 Generate (or Regenerate) Invoice by Booking ID
 * - Always regenerates if invoice exists (same _id)
 * - Creates new if none exists
 * - Automatically uses auth user as createdBy
 */
export const generateInvoiceByBookingId = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user?._id; // ✅ from requireAuth middleware

        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required",
            });
        }

        // ✅ Fetch booking and related data
        const booking = await Booking.findById(bookingId)
            .populate("prebookingServices", "name")
            .populate("upsells.services", "name")
            .lean();

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        // ✅ Build invoice line items
        const items = [];

        // Prebooking services
        booking.prebookingServices?.forEach((service, i) => {
            items.push({
                description: `Prebooking Service ${i + 1}: ${service.name}`,
                amount: i === 0 ? Number(booking.prebookingBookingPrice || 0) : 0,
            });
        });

        // Upsell services
        booking.upsells?.forEach((upsell, i) => {
            upsell.services?.forEach((s) => {
                items.push({
                    description: `Upsell ${i + 1}: ${s.name}`,
                    amount: Number(upsell.upsellPrice || 0),
                });
            });
        });

        // ✅ Default financial values
        const discountAmount = 0;
        const vatIncluded = true;
        const status = "Receivable";

        // ✅ Calculate subtotal only (no VAT or discount)
        const totalAmount = items.reduce((sum, i) => sum + Number(i.amount || 0), 0);

        // ✅ Common invoice data
        const invoiceData = {
            booking: booking._id,
            customerName: booking.ownerName,
            contactNo: booking.ownerNumber,
            vehicleRegNo: booking.vehicleRegNo,
            makeModel: booking.makeModel,
            postalCode: booking.ownerPostalCode,
            landingDate: booking.arrivedAt || booking.scheduledDate || booking.createdAt || null,
            items,
            discountAmount,
            vatIncluded,
            totalAmount,
            status,
            createdBy: userId || booking.createdBy,
        };

        // ✅ Check for existing invoice
        let invoice = await Invoice.findOne({ booking: booking._id });

        if (invoice) {
            Object.assign(invoice, invoiceData);
            await invoice.save();

            return res.status(200).json({
                success: true,
                message: "Invoice regenerated successfully",
                invoice,
            });
        }

        // ✅ Create a new invoice
        const invoiceNo = await generateInvoiceNo();
        invoice = await Invoice.create({
            ...invoiceData,
            invoiceNo,
        });

        return res.status(201).json({
            success: true,
            message: "Invoice created successfully",
            invoice,
        });
    } catch (err) {
        console.error("❌ Generate invoice error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to generate or regenerate invoice",
            error: err.message,
        });
    }
};
