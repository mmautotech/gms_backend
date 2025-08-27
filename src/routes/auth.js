// routes/auth.js
import express from "express";
import { login } from "../controllers/authController.js";
import { loginValidator } from "../validators/auth.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

// Auth
router.post("/login", loginValidator, validate, login);

export default router;
