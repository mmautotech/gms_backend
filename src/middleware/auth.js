// src/middleware/auth.js
import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload; // { id, username }
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Optional: role guard
export function requireRole(...roles) {
    return (req, res, next) => {
        const userType = req.user?.userType; // If you include userType in JWT later
        if (!userType || !roles.includes(userType)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}