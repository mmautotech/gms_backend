// controllers/upsellController.js
import Upsell from "../models/Upsell.js";

/**
 * Create a new upsell for a booking
 */
export const createUpsell = async (req, res) => {
    try {
        const { bookingId, partId, partPrice, labourPrice, supplierId } = req.body;
        const createdBy = req.user._id; // assuming auth middleware sets req.user

        const upsell = await Upsell.create({
            bookingId,
            partId,
            partPrice,
            labourPrice,
            supplierId: supplierId || null,
            createdBy,
        });

        res.status(201).json({ success: true, data: upsell });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Get all upsells for a specific booking
 */
export const getUpsellsByBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const upsells = await Upsell.find({ bookingId })
            .populate("partId", "partName partNumber")
            .populate("supplierId", "name contact")
            .populate("createdBy", "username email");

        res.json({ success: true, data: upsells });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get single upsell by ID
 */
export const getUpsellById = async (req, res) => {
    try {
        const upsell = await Upsell.findById(req.params.id)
            .populate("partId", "partName partNumber")
            .populate("supplierId", "name contact")
            .populate("createdBy", "username email");

        if (!upsell) return res.status(404).json({ success: false, message: "Upsell not found" });

        res.json({ success: true, data: upsell });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update an upsell
 */
export const updateUpsell = async (req, res) => {
    try {
        const { partId, partPrice, labourPrice, supplierId } = req.body;

        const upsell = await Upsell.findByIdAndUpdate(
            req.params.id,
            { partId, partPrice, labourPrice, supplierId },
            { new: true, runValidators: true }
        );

        if (!upsell) return res.status(404).json({ success: false, message: "Upsell not found" });

        res.json({ success: true, data: upsell });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Delete an upsell
 */
export const deleteUpsell = async (req, res) => {
    try {
        const upsell = await Upsell.findByIdAndDelete(req.params.id);

        if (!upsell) return res.status(404).json({ success: false, message: "Upsell not found" });

        res.json({ success: true, message: "Upsell deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
