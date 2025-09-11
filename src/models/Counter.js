// models/Counter.js
import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // name of the sequence (e.g., "invoice")
    seq: { type: Number, default: 0 },     // current sequence value
});

export default mongoose.model("Counter", counterSchema);
