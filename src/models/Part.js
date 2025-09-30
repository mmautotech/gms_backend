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
            default: null,
            trim: true,
        },
        price: {
            type: Number,
            required: [true, "Price is required"],
            min: [0, "Price cannot be negative"],
            set: (v) => Number(v.toFixed(2)), // enforce 2 decimal places
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

// ✅ Unique index on partName + partNumber
PartSchema.index({ partName: 1, partNumber: 1 }, { unique: true });

// ✅ Text index for search
PartSchema.index({
    partName: "text",
    partNumber: "text",
    description: "text",
});

const Part = mongoose.model("Part", PartSchema);
export default Part;
