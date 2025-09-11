import Counter from "../models/Counter.js";

const generateInvoiceNo = async () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    // e.g. "20250911"

    const counter = await Counter.findOneAndUpdate(
        { _id: `invoice-${today}` },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    const nextNo = counter.seq.toString().padStart(3, "0");
    return `INV-${today}-${nextNo}`;
};

export default generateInvoiceNo;
