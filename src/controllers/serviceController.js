// controllers/serviceController.js
import Service from "../models/Service.js";
import Part from "../models/Part.js";   // ✅ Missing import added
import mongoose from "mongoose";

/**
 * GET /api/service/options
 */
export const getServiceOptions = async (req, res) => {
    try {
        const { enabled, format = "list" } = req.query;
        const filter = {};
        if (enabled === "true") filter.enabled = true;
        if (enabled === "false") filter.enabled = false;

        const services = await Service.find(filter)
            .select("_id name enabled")
            .sort({ name: 1 })
            .lean();

        let data;
        if (format === "map") {
            data = Object.fromEntries(services.map((s) => [s._id.toString(), s.name]));
        } else {
            data = services.map((s) => ({ id: s._id.toString(), name: s.name }));
        }

        return res.json({
            success: true,
            data,
            meta: { count: services.length, format, filteredByEnabled: enabled ?? null },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: "Error fetching service options",
            details: error.message,
        });
    }
};

/**
 * Create a new service
 */
export const createService = async (req, res) => {
    try {
        const { name, enabled = true, parts = [] } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: "Service name is required" });
        }

        const exists = await Service.findOne({ name });
        if (exists) {
            return res.status(400).json({ success: false, error: "Service already exists" });
        }

        const service = new Service({ name, enabled, parts });
        await service.save();

        const populated = await service.populate("parts", "partName partNumber isActive");
        return res.status(201).json({ success: true, data: populated });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: "Error creating service",
            details: error.message,
        });
    }
};

/**
 * Get all services (no parts in response)
 */
export const getAllServices = async (_req, res) => {
    try {
        const services = await Service.find()
            .select("_id name enabled createdAt updatedAt")
            .sort({ createdAt: -1 });

        return res.json({ success: true, data: services });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: "Error fetching services",
            details: error.message,
        });
    }
};

/**
 * Get parts of a single service (active & inactive)
 */
export const getServiceParts = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: "Invalid service ID" });
        }

        const service = await Service.findById(id).populate("parts", "partName partNumber isActive");
        if (!service) return res.status(404).json({ success: false, error: "Service not found" });

        const mapped = service.parts.map((p) => ({
            id: p._id,
            label: p.partNumber ? `${p.partName} (${p.partNumber})` : p.partName,
            isActive: p.isActive,
        }));

        return res.json({ success: true, data: mapped });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: "Error fetching service parts",
            details: error.message,
        });
    }
};

/**
 * Update a service
 */
export const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, enabled, parts } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: "Invalid service ID" });
        }

        const service = await Service.findById(id);
        if (!service) return res.status(404).json({ success: false, error: "Service not found" });

        if (name !== undefined) service.name = name;
        if (enabled !== undefined) service.enabled = enabled;
        if (Array.isArray(parts)) service.parts = parts;

        await service.save();

        return res.json({ success: true, message: "Service updated successfully" });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: "Error updating service",
            details: error.message,
        });
    }
};

/**
 * Soft delete a service
 */
export const deleteService = async (req, res) => {
    try {
        const { id } = req.params;

        const service = await Service.findByIdAndUpdate(id, { enabled: false }, { new: true });
        if (!service) return res.status(404).json({ success: false, error: "Service not found" });

        return res.json({ success: true, message: "Service disabled successfully" });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: "Error disabling service",
            details: error.message,
        });
    }
};

/**
 * Reactivate a service
 */
export const activateService = async (req, res) => {
    try {
        const { id } = req.params;

        const service = await Service.findByIdAndUpdate(id, { enabled: true }, { new: true });
        if (!service) return res.status(404).json({ success: false, error: "Service not found" });

        return res.json({ success: true, message: "Service reactivated successfully" });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: "Error reactivating service",
            details: error.message,
        });
    }
};

/**
 * Add part(s) to a service
 */
export const addPartToService = async (req, res) => {
    try {
        const { id } = req.params;
        let { partId, partIds } = req.body;

        if (partId) partIds = [partId];
        if (!Array.isArray(partIds) || partIds.length === 0) {
            return res.status(400).json({ success: false, error: "partIds required" });
        }

        const validParts = await Part.find({ _id: { $in: partIds } }).select("_id");
        if (validParts.length === 0) {
            return res.status(400).json({ success: false, error: "No valid partIds found" });
        }

        const service = await Service.findByIdAndUpdate(
            id,
            { $addToSet: { parts: { $each: validParts.map((p) => p._id) } } },
            { new: true }
        );

        if (!service) return res.status(404).json({ success: false, error: "Service not found" });

        return res.json({ success: true, message: "Parts added successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Remove part(s) from a service
 */
export const removePartFromService = async (req, res) => {
    try {
        const { id } = req.params;
        let { partId, partIds } = req.body;

        if (partId) partIds = [partId];
        if (!Array.isArray(partIds) || partIds.length === 0) {
            return res.status(400).json({ success: false, error: "partIds required" });
        }

        const service = await Service.findByIdAndUpdate(
            id,
            { $pull: { parts: { $in: partIds } } },
            { new: true }
        );

        if (!service) return res.status(404).json({ success: false, error: "Service not found" });

        return res.json({ success: true, message: "Parts removed successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
