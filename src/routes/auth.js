import express from "express";
import { login, register, forgotPassword } from "../controllers/authController.js";
import { loginValidator, registerValidator, forgotPasswordValidator } from "../validators/auth.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

// 🔹 Login
router.post("/login", loginValidator, validate, login);

// 🔹 Admin creates user (register) with userType
router.post("/register", registerValidator, validate, register);

// 🔹 Forgot password (all users)
router.post("/forgot-password", forgotPasswordValidator, validate, forgotPassword);

export default router;
