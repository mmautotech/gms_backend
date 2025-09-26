// src/routes/authRoutes.js
import express from "express";
import {
    login,
    register,
    forgotPassword,
    adminChangePassword,
    getAllUsers
} from "../controllers/authController.js";
import {
    loginValidator,
    registerValidator,
    forgotPasswordValidator,
    adminChangePasswordValidator,
} from "../validators/auth.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// 🔹 Login (public)
router.post("/login", loginValidator, validate, login);

// 🔹 Register (admin creates user) - admin only
router.post(
    "/register",
    requireAuth,
    requireRole("admin"),
    registerValidator,
    validate,
    register
);

// 🔹 Forgot password (all users) - public if you want regular users to reset
router.post(
    "/forgot-password",
    forgotPasswordValidator,
    validate,
    forgotPassword
);

// 🔹 Admin changes any user's password - admin only
router.post(
    "/admin-change-password",
    requireAuth,
    requireRole("admin"),
    adminChangePasswordValidator,
    validate,
    adminChangePassword
);


router.get("/users", requireAuth, requireRole("admin"), getAllUsers);

export default router;