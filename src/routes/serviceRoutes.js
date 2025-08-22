// routes/serviceRoutes.js
import express from "express";
import Service from "../models/Services.js";

const router = express.Router();

/**
 * Create a new service
 */
router.post("/", async (req, res) => {
  try {
    const { name, enabled = true } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Service name is required" });
    }
    const service = new Service({ name, enabled });
    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ message: "Error creating service", error });
  }
});

/**
 * Get all services
 */
router.get("/", async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: "Error fetching services", error });
  }
});

/**
 * Update a service (edit by ID)
 */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, enabled } = req.body;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    if (name !== undefined) service.name = name;
    if (enabled !== undefined) service.enabled = enabled;

    await service.save();
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: "Error updating service", error });
  }
});

/**
 * Delete a service by ID
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findByIdAndDelete(id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json({ message: "Service deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting service", error });
  }
});

export default router;
