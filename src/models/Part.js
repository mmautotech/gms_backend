// models/Part.js
import mongoose from "mongoose";

const PartSchema = new mongoose.Schema(
    {
        partName: {
            type: String,
            required: true,
            trim: true,
        },
        partNumber: {
            type: String,
            default: null,
            trim: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

// Uniqueness logic:
//  - If partNumber is null → unique partName
//  - If partNumber is not null → unique combination of partName + partNumber
PartSchema.index(
    { partName: 1, partNumber: 1 },
    { unique: true, partialFilterExpression: { partNumber: { $exists: true } } }
);
PartSchema.index(
    { partName: 1 },
    { unique: true, partialFilterExpression: { partNumber: null } }
);

const Part = mongoose.model("Part", PartSchema);
export default Part;
