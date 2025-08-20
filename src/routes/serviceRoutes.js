// routes/serviceRoutes.js
import express from "express";
import Service from "../models/Services.js";

const router = express.Router();

// Create a new service
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Service name is required" });
    }
    const service = new Service({ name });
    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ message: "Error creating service", error });
  }
});

// Get all services
router.get("/", async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: "Error fetching services", error });
  }
});

export default router;
