const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const authMiddleware = require('../middleware/authMiddleware');

// GET all coupons (Admin)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json(coupons);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create coupon (Admin)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { code, discountPercent, maxDiscount, usageLimit, expiresAt } = req.body;
        if (!code || !discountPercent) {
            return res.status(400).json({ message: 'Code and discount percent are required' });
        }
        const coupon = new Coupon({
            code: code.toUpperCase().trim(),
            discountPercent,
            maxDiscount: maxDiscount || 0,
            usageLimit: usageLimit || 0,
            expiresAt: expiresAt || null
        });
        const saved = await coupon.save();
        res.status(201).json(saved);
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ message: 'Coupon code already exists' });
        res.status(500).json({ message: err.message });
    }
});

// DELETE coupon (Admin)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await Coupon.findByIdAndDelete(req.params.id);
        res.json({ message: 'Coupon deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT toggle coupon active (Admin)
router.put('/:id/toggle', authMiddleware, async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
        coupon.isActive = !coupon.isActive;
        await coupon.save();
        res.json(coupon);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST validate coupon (Public — used at checkout)
router.post('/validate', async (req, res) => {
    try {
        const { code } = req.body;
        const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), isActive: true });
        if (!coupon) return res.status(404).json({ message: 'Invalid or expired coupon' });
        if (coupon.expiresAt && new Date() > coupon.expiresAt) {
            return res.status(400).json({ message: 'Coupon has expired' });
        }
        if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ message: 'Coupon usage limit reached' });
        }
        res.json({
            code: coupon.code,
            discountPercent: coupon.discountPercent,
            maxDiscount: coupon.maxDiscount
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
