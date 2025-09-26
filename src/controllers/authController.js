// src/controllers/authController.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "crypto";

/** -------------------------
 * User login
 ------------------------- */
export async function login(req, res) {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) {
            return res.status(400).json({ error: "Missing fields" });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username, userType: user.userType },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                userType: user.userType,
            },
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

/** -------------------------
 * Admin creates a user (all roles)
 ------------------------- */
export async function register(req, res) {
    try {
        const { username, password, userType } = req.body || {};
        const requestingUser = req.user; // JWT middleware sets req.user

        if (!username || !password || !userType) {
            return res.status(400).json({ error: "Missing fields" });
        }

        const allowedRoles = ["admin", "sales", "customer_service", "parts", "accounts"];
        if (!allowedRoles.includes(userType)) {
            return res.status(400).json({ error: `Invalid userType. Allowed: ${allowedRoles.join(", ")}` });
        }

        // Only admins can create another admin
        if (userType === "admin" && requestingUser.userType !== "admin") {
            return res.status(403).json({ error: "Only admins can create another admin" });
        }

        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ error: "Username already exists" });

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await User.create({ username, passwordHash, userType });

        res.status(201).json({
            message: "User created successfully",
            user: {
                id: user._id,
                username: user.username,
                userType: user.userType,
            },
        });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

/** -------------------------
 * Forgot Password (all users)
 ------------------------- */
export async function forgotPassword(req, res) {
    try {
        const { username } = req.body || {};
        if (!username) {
            return res.status(400).json({ error: "Username is required" });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Generate a temporary reset token
        const resetToken = crypto.randomBytes(4).toString("hex"); // short token
        const resetTokenHash = await bcrypt.hash(resetToken, 10);

        // Save token temporarily in user
        user.resetToken = resetTokenHash;
        user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
        await user.save();

        // Return token (for demo; normally you'd email it)
        res.json({
            message: `Password reset token generated for username ${username}`,
            resetToken
        });
    } catch (err) {
        console.error("Forgot password error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

/** -------------------------
 * Admin changes any user's password
 ------------------------- */
export async function adminChangePassword(req, res) {
    try {
        const { username, newPassword } = req.body;
        const requestingUser = req.user; // JWT middleware sets req.user

        if (!username || !newPassword) {
            return res.status(400).json({ error: "Missing fields" });
        }

        // Only admins can change passwords
        if (requestingUser.userType !== "admin") {
            return res.status(403).json({ error: "Only admins can change passwords" });
        }

        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: "User not found" });

        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: `Password for ${username} updated successfully` });
    } catch (err) {
        console.error("Admin change password error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}


export async function getAllUsers(req, res) {
    try {
        // Only admins can call this
        const users = await User.find({}, "username userType").sort({ username: 1 });
        res.json({ users });
    } catch (err) {
        console.error("Get all users error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}