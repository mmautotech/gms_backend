import InternalInvoice from "../../models/InternalInvoice.js";
import Invoice from "../../models/Invoice.js";
import PurchaseInvoice from "../../models/PurchaseInvoice.js";

export const createInternalInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.body;
        const VAT_RATE = 0.2;

        if (!invoiceId)
            return res.status(400).json({ message: "invoiceId is required" });

        // -----------------------------
        // Fetch main invoice
        // -----------------------------
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice)
            return res.status(404).json({ message: "Invoice not found" });

        // -----------------------------
        // Fetch purchase invoices
        // -----------------------------
        const purchaseInvoices = await PurchaseInvoice.find({
            booking: invoice.booking,
        });

        // -----------------------------
        // Sales calculation
        // -----------------------------
        const sales = invoice.totalAmount || 0;

        // -----------------------------
        // Purchases calculation + Purchase VAT
        // -----------------------------
        let purchases = 0;
        let purchaseVat = 0;

        if (purchaseInvoices?.length) {
            purchaseInvoices.forEach((pi) => {
                pi.items?.forEach((i) => {
                    const base = (i.rate || 0) * (i.quantity || 1);
                    if (pi.vatIncluded) {
                        const vat = base * VAT_RATE;
                        purchaseVat += vat; // ✅ only add VAT separately
                        purchases += base; // ✅ store purchase without VAT
                    } else {
                        purchases += base;
                    }
                });
            });
        }

        // -----------------------------
        // Sales VAT (output VAT)
        // -----------------------------
        const salesVat = invoice.vatIncluded
            ? sales - sales / (1 + VAT_RATE)
            : 0;

        // -----------------------------
        // Net VAT (sales VAT + purchase VAT if vatIncluded)
        // -----------------------------
        const netVat = salesVat + purchaseVat;

        // -----------------------------
        // Profit = Sales - Purchases - Net VAT
        // -----------------------------
        const profit = sales - purchases - netVat;

        // -----------------------------
        // Round values
        // -----------------------------
        const round2 = (v) => Number((v || 0).toFixed(2));
        const roundedSales = round2(sales);
        const roundedPurchases = round2(purchases);
        const roundedNetVat = round2(netVat);
        const roundedProfit = round2(profit);

        // -----------------------------
        // Upsert internal invoice
        // -----------------------------
        let internal = await InternalInvoice.findById(invoiceId);

        if (internal) {
            internal.purchaseInvoices = purchaseInvoices.map((pi) => pi._id);
            internal.sales = roundedSales;
            internal.purchases = roundedPurchases;
            internal.netVat = roundedNetVat;
            internal.profit = roundedProfit;
            internal.discountSales = invoice.discountAmount || 0;
            internal.discountPurchases = purchaseInvoices.reduce(
                (sum, pi) => sum + (pi.discountAmount || 0),
                0
            );
            internal.updatedBy = req.user?._id;
            await internal.save();

            return res.status(200).json({
                success: true,
                message: "Internal invoice updated successfully",
                data: internal,
            });
        }

        // -----------------------------
        // Create new internal invoice
        // -----------------------------
        internal = new InternalInvoice({
            _id: invoice._id,
            booking: invoice.booking,
            invoice: invoice._id,
            purchaseInvoices: purchaseInvoices.map((pi) => pi._id),
            sales: roundedSales,
            purchases: roundedPurchases,
            netVat: roundedNetVat,
            profit: roundedProfit,
            discountSales: invoice.discountAmount || 0,
            discountPurchases: purchaseInvoices.reduce(
                (sum, pi) => sum + (pi.discountAmount || 0),
                0
            ),
            createdBy: req.user?._id,
        });

        await internal.save();

        return res.status(201).json({
            success: true,
            message: "Internal invoice created successfully",
            data: internal,
        });
    } catch (err) {
        console.error("❌ Error creating/updating internal invoice:", err);
        res.status(500).json({
            success: false,
            message: "Server error while creating/updating internal invoice",
            error: err.message,
        });
    }
};
