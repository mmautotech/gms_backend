import Service from "../models/Service.js";
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
        console.error("❌ getServiceOptions error:", error);
        return res.status(500).json({
            success: false,
            error: "Error fetching service options",
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

        // Case-insensitive duplicate check
        const exists = await Service.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
        if (exists) {
            return res.status(400).json({ success: false, error: "Service already exists" });
        }

        const service = new Service({ name, enabled, parts });
        await service.save();

        const populated = await Service.findById(service._id)
            .populate({
                path: "parts",
                match: { isActive: true },
                select: "partName isActive",
            })
            .lean();

        return res.status(201).json({ success: true, data: populated });
    } catch (error) {
        console.error("❌ createService error:", error);
        return res.status(500).json({
            success: false,
            error: "Error creating service",
        });
    }
};

/**
 * Get all services (return parts IDs + partsCount)
 */
export const getAllServices = async (_req, res) => {
    try {
        const services = await Service.find()
            .select("_id name enabled createdAt updatedAt parts")
            .sort({ createdAt: -1 })
            .lean();

        const withCounts = services.map((s) => ({
            ...s,
            partsCount: s.parts?.length || 0,
        }));

        return res.json({ success: true, data: withCounts });
    } catch (error) {
        console.error("❌ getAllServices error:", error);
        return res.status(500).json({
            success: false,
            error: "Error fetching services",
        });
    }
};

/**
 * Get a single service by ID (with full parts populated)
 */
export const getServiceById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: "Invalid service ID" });
        }

        const service = await Service.findById(id)
            .populate({
                path: "parts",
                match: { isActive: true },
                select: "partName isActive",
            })
            .lean();

        if (!service) {
            return res.status(404).json({ success: false, error: "Service not found" });
        }

        return res.json({ success: true, data: service });
    } catch (error) {
        console.error("❌ getServiceById error:", error);
        return res.status(500).json({
            success: false,
            error: "Error fetching service",
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

        // duplicate name check (exclude self)
        if (name && name.toLowerCase() !== service.name.toLowerCase()) {
            const exists = await Service.findOne({
                _id: { $ne: id },
                name: { $regex: new RegExp(`^${name}$`, "i") },
            });
            if (exists) {
                return res.status(400).json({ success: false, error: "Service name already exists" });
            }
        }

        if (name !== undefined) service.name = name;
        if (enabled !== undefined) service.enabled = enabled;
        if (Array.isArray(parts)) service.parts = parts;

        await service.save();

        const populated = await Service.findById(id)
            .populate({
                path: "parts",
                match: { isActive: true },
                select: "partName isActive",
            })
            .lean();

        return res.json({ success: true, data: populated, message: "Service updated successfully" });
    } catch (error) {
        console.error("❌ updateService error:", error);
        return res.status(500).json({
            success: false,
            error: "Error updating service",
        });
    }
};

/**
 * Soft delete a service
 */
export const deleteService = async (req, res) => {
    try {
        const { id } = req.params;

        const service = await Service.findByIdAndUpdate(id, { enabled: false }, { new: true })
            .populate({
                path: "parts",
                match: { isActive: true },
                select: "partName isActive",
            })
            .lean();

        if (!service) return res.status(404).json({ success: false, error: "Service not found" });

        return res.json({ success: true, data: service, message: "Service disabled successfully" });
    } catch (error) {
        console.error("❌ deleteService error:", error);
        return res.status(500).json({
            success: false,
            error: "Error disabling service",
        });
    }
};

/**
 * Reactivate a service
 */
export const activateService = async (req, res) => {
    try {
        const { id } = req.params;

        const service = await Service.findByIdAndUpdate(id, { enabled: true }, { new: true })
            .populate({
                path: "parts",
                match: { isActive: true },
                select: "partName isActive",
            })
            .lean();

        if (!service) return res.status(404).json({ success: false, error: "Service not found" });

        return res.json({ success: true, data: service, message: "Service reactivated successfully" });
    } catch (error) {
        console.error("❌ activateService error:", error);
        return res.status(500).json({
            success: false,
            error: "Error reactivating service",
        });
    }
};

/**
 * Get parts of a service only (returns full part docs)
 */
export const getServiceParts = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: "Invalid service ID" });
        }

        const service = await Service.findById(id)
            .populate({
                path: "parts",
                match: { isActive: true },
                select: "partName isActive",
            })
            .lean();

        if (!service) {
            return res.status(404).json({ success: false, error: "Service not found" });
        }

        return res.json({ success: true, data: service.parts || [] });
    } catch (error) {
        console.error("❌ getServiceParts error:", error);
        return res.status(500).json({
            success: false,
            error: "Error fetching service parts",
        });
    }
};
