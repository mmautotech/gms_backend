// models/Service.js
import mongoose from "mongoose";

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
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

const Service = mongoose.model("Service", ServiceSchema);

export default Service;
