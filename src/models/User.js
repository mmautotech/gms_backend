import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            unique: true,
            required: true,
            trim: true,
            lowercase: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
        userType: {
            type: String,
            enum: ["admin", "sales", "customer_service", "parts", "accounts"],
            default: "sales",
        },
    },
    { timestamps: true }
);

export default mongoose.model("User", UserSchema);
