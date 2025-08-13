import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Seed admin for dev
// (Dev helper) Seed admin for dev
router.post('/seed-admin', async (_req, res) => {
    const exists = await User.findOne({ username: 'admin' });
    if (exists) return res.json({ ok: true, message: 'Admin exists' });

    const passwordHash = await bcrypt.hash('admin123', 10);
    await User.create({
        username: 'admin',
        passwordHash,
        userType: 'admin'
    });

    res.json({ ok: true, message: 'Seeded admin/admin123 with userType=admin' });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
        token,
        user: {
            id: user._id,
            username: user.username,
            userType: user.userType
        }
    });
});

export default router;
