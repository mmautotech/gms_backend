// controllers/serviceController.js
import Service from "../models/Service.js";

/**
 * Create a new service
 */
export const createService = async (req, res) => {
    try {
        const { name, enabled = true } = req.body;
        if (!name) {
            return res.status(400).json({ error: "Service name is required" });
        }

        const exists = await Service.findOne({ name });
        if (exists) {
            return res.status(400).json({ error: "Service already exists" });
        }

        const service = new Service({ name, enabled });
        await service.save();
        res.status(201).json(service);
    } catch (error) {
        res.status(500).json({ error: "Error creating service", details: error.message });
    }
};

/**
 * Get all services
 */
export const getAllServices = async (_req, res) => {
    try {
        const services = await Service.find().sort({ createdAt: -1 });
        res.json(services);
    } catch (error) {
        res.status(500).json({ error: "Error fetching services", details: error.message });
    }
};

/**
 * Update a service
 */
export const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, enabled } = req.body;

        const service = await Service.findById(id);
        if (!service) return res.status(404).json({ error: "Service not found" });

        if (name !== undefined) service.name = name;
        if (enabled !== undefined) service.enabled = enabled;

        await service.save();
        res.json(service);
    } catch (error) {
        res.status(500).json({ error: "Error updating service", details: error.message });
    }
};

/**
 * Delete a service
 */
export const deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await Service.findByIdAndDelete(id);
        if (!service) return res.status(404).json({ error: "Service not found" });

        res.json({ message: "Service deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error deleting service", details: error.message });
    }
};
