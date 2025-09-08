// middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const requireAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) throw new Error("No token provided");

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) throw new Error("User not found");

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }
};

// Optional: role guard
export function requireRole(...roles) {
    return (req, res, next) => {
        const userType = req.user?.userType;
        if (!userType || !roles.includes(userType)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        next();
    };
}
