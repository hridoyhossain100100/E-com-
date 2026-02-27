const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const authMiddleware = require('../middleware/authMiddleware');

// Default settings
const DEFAULTS = {
    shippingZones: [
        { id: 'dhaka', label: 'Inside Dhaka', cost: 60 },
        { id: 'outside', label: 'Outside Dhaka', cost: 120 },
        { id: 'remote', label: 'Remote Area', cost: 180 }
    ],
    categories: ['General'],
    banner: { text: '', enabled: false },
    storeName: 'ShopVibe'
};

// GET all settings (public — used by frontend)
router.get('/', async (req, res) => {
    try {
        const all = await Settings.find({});
        const result = { ...DEFAULTS };
        all.forEach(s => { result[s.key] = s.value; });
        res.json(result);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT update a setting (admin only)
router.put('/:key', authMiddleware, async (req, res) => {
    try {
        const { value } = req.body;
        if (value === undefined) return res.status(400).json({ message: 'value is required' });
        const setting = await Settings.findOneAndUpdate(
            { key: req.params.key },
            { value },
            { upsert: true, new: true }
        );
        res.json(setting);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
