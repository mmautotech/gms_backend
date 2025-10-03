import mongoose from "mongoose";

const PartSchema = new mongoose.Schema(
    {
        partName: {
            type: String,
            required: [true, "Part name is required"],
            trim: true,
            unique: true, // 🔹 enforce uniqueness directly
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

// ✅ Text search only on partName
PartSchema.index({ partName: "text" });

const Part = mongoose.model("Part", PartSchema);
export default Part;
