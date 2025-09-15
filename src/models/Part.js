// models/Part.js
import mongoose from "mongoose";

const PartSchema = new mongoose.Schema(
    {
        sku: {
            type: String,
            required: [true, "SKU is required"],
            unique: true,
            trim: true,
        },
        name: {
            type: String,
            required: [true, "Part name is required"],
            trim: true,
        },
        category: {
            type: String,
            default: null,
            trim: true,
        },
        currentStock: {
            type: Number,
            default: 0,
            min: [0, "Stock cannot be negative"],
        },
        minStock: {
            type: Number,
            default: 0,
        },
        maxStock: {
            type: Number,
            default: 0,
        },
        unitPrice: {
            type: Number,
            default: 0,
        },
        supplier: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Supplier",
            required: [true, "Supplier is required"],
        },
        lastRestocked: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

PartSchema.index({ name: "text", sku: "text", category: "text" });

const Part = mongoose.model("Part", PartSchema);
export default Part;
