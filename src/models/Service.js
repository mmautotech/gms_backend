// models/Service.js
import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const ServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    enabled: {
      type: Boolean,
      default: true, // admin can disable without deleting
    },
    // ✅ Service contains parts (one-sided relationship)
    parts: [
      {
        type: ObjectId,
        ref: "Part",
        default: [],
      },
    ],
  },
  { timestamps: true }
);

const Service = mongoose.model("Service", ServiceSchema);
export default Service;