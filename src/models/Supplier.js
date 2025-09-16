import mongoose from "mongoose";

const SupplierSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Supplier name is required"],
            trim: true,
            unique: true,
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
            match: [/.+@.+\..+/, "Please enter a valid email address"],
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

// Unique index on supplier name
SupplierSchema.index({ name: 1 }, { unique: true });

const Supplier = mongoose.model("Supplier", SupplierSchema);
export default Supplier;
