// middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, error: "Authorization header missing" });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ success: false, error: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select("-passwordHash");
        if (!user) {
            return res.status(401).json({ success: false, error: "User not found" });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error("Auth error:", err.message);
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }
};

// Role guard middleware
export const requireRole = (...roles) => {
    return (req, res, next) => {
        const userType = req.user?.userType;
        if (!userType || !roles.includes(userType)) {
            return res.status(403).json({ success: false, error: "Forbidden: insufficient rights" });
        }
        next();
    };
};
