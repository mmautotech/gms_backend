// models/Part.js
import mongoose from "mongoose";

const PartSchema = new mongoose.Schema(
    {
        partName: {
            type: String,
            required: [true, "Part name is required"],
            trim: true,
        },
        partNumber: {
            type: String,
            default: null, // allow missing/nullable
            trim: true,
        },
        price: {
            type: Number,
            required: [true, "Price is required"],
            min: [0, "Price cannot be negative"],
            set: (v) => Number(v.toFixed(2)), // enforce 2 decimal places
        },
        supplier: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Supplier",
            required: [true, "Supplier reference is required"],
        },
        description: {
            type: String,
            default: null,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

// ✅ Compound unique index for (partName + partNumber)
// Ensures only one combination can exist
PartSchema.index({ partName: 1, partNumber: 1 }, { unique: true });

// Text index for search
PartSchema.index({
    partName: "text",
    partNumber: "text",
    description: "text",
});

const Part = mongoose.model("Part", PartSchema);
export default Part;
