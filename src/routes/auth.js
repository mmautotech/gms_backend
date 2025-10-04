import express from "express";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
    loginValidator,
    registerValidator,
    adminChangePasswordValidator,
} from "../validators/auth.js";
import {
    login,
    register,
    adminChangePassword,
    getAllUsers,
    logout,
} from "../controllers/authController.js";

const router = express.Router();

// 🔹 Public
router.post("/login", loginValidator, validate, login);

// 🔹 Admin-only routes
router.post("/register", requireAuth, requireRole("admin"), registerValidator, validate, register);
router.post("/admin-change-password", requireAuth, requireRole("admin"), adminChangePasswordValidator, validate, adminChangePassword);
router.get("/users", requireAuth, requireRole("admin"), getAllUsers);

// 🔹 Session end
router.post("/logout", requireAuth, logout);

export default router;
