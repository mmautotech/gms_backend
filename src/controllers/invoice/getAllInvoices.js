import Invoice from "../../models/Invoice.js";

/**
 * 🧾 Get All Invoices (with filters + pagination)
 */
export const getAllInvoices = async (req, res) => {
    try {
        let { page = 1, limit = 20, search, fromDate, toDate, status } = req.query;
        page = parseInt(page, 10);
        limit = parseInt(limit, 10);
        const skip = (page - 1) * limit;

        const filter = {};
        if (search) {
            const regex = new RegExp(search, "i");
            filter.$or = [
                { invoiceNo: regex },
                { customerName: regex },
                { contactNo: regex },
                { postalCode: regex },
                { vehicleRegNo: regex },
                { makeModel: regex },
            ];
        }

        if (fromDate || toDate) {
            filter.invoiceDate = {};
            if (fromDate) filter.invoiceDate.$gte = new Date(fromDate);
            if (toDate) {
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999);
                filter.invoiceDate.$lte = to;
            }
        }

        if (status) filter.status = status;

        const totalInvoices = await Invoice.countDocuments(filter);
        const invoices = await Invoice.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const invoicesWithRowNumber = invoices.map((inv, idx) => ({
            ...inv,
            rowNumber: skip + idx + 1,
        }));

        res.status(200).json({
            data: invoicesWithRowNumber,
            pagination: {
                total: totalInvoices,
                page,
                limit,
                totalPages: Math.ceil(totalInvoices / limit),
                hasNextPage: page * limit < totalInvoices,
                hasPrevPage: page > 1,
            },
        });
    } catch (err) {
        console.error("Error fetching invoices:", err);
        res.status(500).json({ message: "Failed to get invoices", error: err.message });
    }
};
