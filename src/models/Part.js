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
            default: null,
            trim: true,
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

// ✅ Ensure uniqueness on partName + partNumber
PartSchema.index({ partName: 1, partNumber: 1 }, { unique: true });

// ✅ Text search
PartSchema.index({
    partName: "text",
    partNumber: "text",
    description: "text",
});

const Part = mongoose.model("Part", PartSchema);
export default Part;
