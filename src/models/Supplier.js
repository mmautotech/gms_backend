// models/Supplier.js
import mongoose from "mongoose";

const SupplierSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Supplier name is required"],
            trim: true,
        },
        contact: {
            type: String,
            required: [true, "Contact is required"],
            trim: true,
        },
        bankAccount: {
            type: String,
            required: [true, "Bank account is required"],
            trim: true,
        },
        address: {
            type: String,
            default: null,
            trim: true,
        },
        email: {
            type: String,
            default: null,
            trim: true,
            lowercase: true,
            match: [/.+@.+\..+/, "Please enter a valid email address"], // optional email validation
        },
    },
    { timestamps: true }
);

// Optional: Ensure unique supplier names
SupplierSchema.index({ name: 1 }, { unique: true });

const Supplier = mongoose.model("Supplier", SupplierSchema);
export default Supplier;
