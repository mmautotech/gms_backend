import InternalInvoice from "../../models/InternalInvoice.js";
import Invoice from "../../models/Invoice.js";
import PurchaseInvoice from "../../models/PurchaseInvoice.js";

/**
 * ✅ Create or Update an Internal Invoice
 * Uses `invoiceId` as the primary _id for InternalInvoice
 */
export const createInternalInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.body;
        const VAT_RATE = 0.2;

        if (!invoiceId)
            return res.status(400).json({ message: "invoiceId is required" });

        // -----------------------------
        // 🔍 Validate Invoice
        // -----------------------------
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice)
            return res.status(404).json({ message: "Invoice not found" });

        // -----------------------------
        // 🧾 Get Purchase Invoices
        // -----------------------------
        const purchaseInvoices = await PurchaseInvoice.find({
            booking: invoice.booking,
        });

        if (!purchaseInvoices?.length)
            return res.status(404).json({
                message: "No purchase invoices found for this booking",
            });

        // -----------------------------
        // 💰 SALES CALCULATION
        // -----------------------------
        let sales = 0;
        let vatOnSales = 0;

        if (invoice.items?.length) {
            invoice.items.forEach((i) => {
                const base = i.amount || 0;
                sales += invoice.vatIncluded ? base + base * VAT_RATE : base;
            });
        } else {
            sales = invoice.vatIncluded
                ? invoice.totalAmount
                : invoice.totalAmount * (1 + VAT_RATE);
        }

        // Calculate VAT on sales (if included)
        if (invoice.vatIncluded) {
            const taxableBase = sales / (1 + VAT_RATE);
            vatOnSales = taxableBase * VAT_RATE;
        }

        // -----------------------------
        // 💸 PURCHASES CALCULATION
        // -----------------------------
        let purchases = 0;
        let vatOnPurchases = 0;

        purchaseInvoices.forEach((pi) => {
            pi.items?.forEach((i) => {
                const base = (i.rate || 0) * (i.quantity || 1);
                purchases += pi.vatIncluded ? base + base * VAT_RATE : base;
                if (pi.vatIncluded) vatOnPurchases += base * VAT_RATE;
            });
        });

        // -----------------------------
        // 🧮 NET VAT & ROUNDING
        // -----------------------------
        const netVat = vatOnSales - vatOnPurchases;
        const round2 = (v) => Number(v.toFixed(2));
        const roundedSales = round2(sales);
        const roundedPurchases = round2(purchases);
        const roundedNetVat = round2(netVat);

        // -----------------------------
        // 🔁 UPSERT (Create or Update)
        // -----------------------------
        let internal = await InternalInvoice.findById(invoiceId);

        if (internal) {
            // ✅ Update existing internal invoice
            internal.purchaseInvoices = purchaseInvoices.map((pi) => pi._id);
            internal.sales = roundedSales;
            internal.purchases = roundedPurchases;
            internal.netVat = roundedNetVat;
            internal.updatedBy = req.user?._id;
            await internal.save();

            return res.status(200).json({
                message: "Internal invoice updated successfully",
                data: internal,
            });
        }

        // ✅ Create new internal invoice (using invoiceId as _id)
        internal = new InternalInvoice({
            _id: invoice._id, // 🔗 use invoiceId as the internal invoice _id
            booking: invoice.booking,
            invoice: invoice._id,
            purchaseInvoices: purchaseInvoices.map((pi) => pi._id),
            sales: roundedSales,
            purchases: roundedPurchases,
            netVat: roundedNetVat,
            createdBy: req.user?._id,
        });

        await internal.save();

        return res.status(201).json({
            message: "Internal invoice created successfully",
            data: internal,
        });
    } catch (err) {
        console.error("❌ Error creating/updating internal invoice:", err);
        res.status(500).json({
            message: "Server error",
            error: err.message,
        });
    }
};
