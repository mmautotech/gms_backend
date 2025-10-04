import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/** -------------------------
 * 🔐 LOGIN
 ------------------------- */
export async function login(req, res) {
    try {
        const { username, password } = req.body || {};
        if (!username || !password)
            return res.status(400).json({ error: "Missing fields" });

        const user = await User.findOne({ username });
        if (!user)
            return res.status(401).json({ error: "Invalid credentials" });

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok)
            return res.status(401).json({ error: "Invalid credentials" });

        // ✅ Token valid for 12 hours
        const token = jwt.sign(
            { id: user._id, username: user.username, userType: user.userType },
            process.env.JWT_SECRET,
            { expiresIn: "12h" }
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
 * 👤 REGISTER (Admin only)
 ------------------------- */
export async function register(req, res) {
    try {
        const { username, password, userType } = req.body || {};
        const requestingUser = req.user;

        if (!username || !password || !userType)
            return res.status(400).json({ error: "Missing fields" });

        const allowedRoles = ["admin", "sales", "customer_service", "parts", "accounts"];
        if (!allowedRoles.includes(userType))
            return res.status(400).json({ error: `Invalid userType. Allowed: ${allowedRoles.join(", ")}` });

        if (userType === "admin" && requestingUser?.userType !== "admin")
            return res.status(403).json({ error: "Only admins can create another admin" });

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
 * 🔒 LOGOUT (Frontend handles token deletion)
 ------------------------- */
export async function logout(req, res) {
    try {
        // No DB changes — just end session client-side
        res.json({ message: "Logged out successfully" });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

/** -------------------------
 * 🛠 ADMIN CHANGE PASSWORD
 ------------------------- */
export async function adminChangePassword(req, res) {
    try {
        const { username, newPassword } = req.body;
        const requestingUser = req.user;

        if (!username || !newPassword)
            return res.status(400).json({ error: "Missing fields" });

        if (requestingUser.userType !== "admin")
            return res.status(403).json({ error: "Only admins can change passwords" });

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

/** -------------------------
 * 👥 GET ALL USERS
 ------------------------- */
export async function getAllUsers(req, res) {
    try {
        const users = await User.find({}, "username userType").sort({ username: 1 });
        res.json({ users });
    } catch (err) {
        console.error("Get all users error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}
