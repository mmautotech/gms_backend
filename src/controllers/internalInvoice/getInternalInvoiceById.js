import InternalInvoice from "../../models/InternalInvoice.js";

/**
 * ✅ Get Single Internal Invoice (Detailed View)
 * _id = invoiceId (1-to-1 mapping)
 */
export const getInternalInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;

        const inv = await InternalInvoice.findById(id)
            .populate({
                path: "invoice",
                populate: { path: "createdBy", select: "username" },
            })
            .populate({
                path: "purchaseInvoices",
                populate: [
                    { path: "purchaser", select: "username" },
                    { path: "supplier", select: "name contact" },
                    { path: "items.part", select: "partName" },
                ],
            })
            .populate("booking")
            .lean();

        if (!inv)
            return res.status(404).json({ message: "Internal invoice not found" });

        // -----------------------------
        // 🧾 Helper Functions
        // -----------------------------
        const round2 = (v) => Number((v || 0).toFixed(2));
        const safeNum = (v) => (isNaN(v) ? 0 : Number(v));

        // -----------------------------
        // 🧾 INVOICE DETAILS
        // -----------------------------
        const invoice = inv.invoice || {};
        const invoiceItems =
            invoice.items?.map((i) => ({
                description: i.description || "N/A",
                amount: round2(i.amount || 0),
            })) || [];

        const invoiceDetails = {
            invoiceNo: invoice.invoiceNo || "N/A",
            customerName: invoice.customerName || "N/A",
            contactNo: invoice.contactNo || "N/A",
            discountAmount: round2(invoice.discountAmount || 0),
            vatIncluded: !!invoice.vatIncluded,
            status: invoice.status || "N/A",
            createdBy: invoice.createdBy?.username || "Unknown",
            createdAt: invoice.createdAt || null,
            items: invoiceItems,
        };

        // -----------------------------
        // 💸 PURCHASE INVOICES
        // -----------------------------
        const purchases =
            inv.purchaseInvoices?.map((pi) => ({
                purchaser: pi.purchaser?.username || "N/A",
                supplier: pi.supplier?.name || "N/A",
                supplierContact: pi.supplier?.contact || "N/A",
                items:
                    pi.items?.map((i) => ({
                        part: i.part?.partName || "N/A",
                        rate: round2(i.rate),
                        quantity: i.quantity,
                        lineTotal: round2((i.rate || 0) * (i.quantity || 0)),
                    })) || [],
                paymentDate: pi.paymentDate || null,
                paymentStatus: pi.paymentStatus || "N/A",
                discount: round2(pi.discount || 0),
                vatIncluded: !!pi.vatIncluded,
                vendorInvoiceNumber: pi.vendorInvoiceNumber || "N/A",
                createdAt: pi.createdAt || null,
            })) || [];

        // -----------------------------
        // 📊 FINANCIAL TOTALS
        // -----------------------------
        const sales = round2(inv.sales);
        const purchaseTotal = round2(inv.purchases);
        const netVat = round2(inv.netVat);
        const calculatedProfit = round2(sales - purchaseTotal - netVat);

        // -----------------------------
        // 📦 Response
        // -----------------------------
        return res.status(200).json({
            success: true,
            data: {
                _id: inv._id,
                booking: {
                    vehicleRegNo: inv.booking?.vehicleRegNo || "N/A",
                    makeModel: inv.booking?.makeModel || "N/A",
                    arrivedAt: inv.booking?.arrivedAt || null,
                },
                invoice: invoiceDetails,
                purchases,
                totals: {
                    sales,
                    purchases: purchaseTotal,
                    netVat,
                    calculatedProfit,
                },
                createdBy: inv.createdBy || null,
                updatedBy: inv.updatedBy || null,
                createdAt: inv.createdAt,
                updatedAt: inv.updatedAt,
            },
        });
    } catch (err) {
        console.error("❌ Error fetching internal invoice:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};
