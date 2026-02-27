const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// POST /api/admin/login
router.post('/login', (req, res) => {
    const { password } = req.body;

    // Check if the provided password matches the ENV password
    if (password === process.env.ADMIN_PASSWORD) {
        // Create JWT token valid for 24 hours
        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });

        // Set HTTP-only cookie
        res.cookie('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        return res.status(200).json({ message: 'Login successful' });
    }

    return res.status(401).json({ message: 'Invalid password' });
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
    res.clearCookie('admin_token');
    return res.status(200).json({ message: 'Logged out successfully' });
});

// GET /api/admin/check
// Simple endpoint to verify if the user is authenticated (frontend use)
const authMiddleware = require('../middleware/authMiddleware');
router.get('/check', authMiddleware, (req, res) => {
    res.status(200).json({ isAuthenticated: true });
});

module.exports = router;
