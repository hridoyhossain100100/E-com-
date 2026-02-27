const express = require('express');
const router = express.Router();
const Review = require('../models/Review');

// GET reviews for a product (Public)
router.get('/:productId', async (req, res) => {
    try {
        const reviews = await Review.find({ productId: req.params.productId }).sort({ createdAt: -1 });
        const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
        res.json({ reviews, averageRating: Math.round(avg * 10) / 10, totalReviews: reviews.length });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST add review (Public)
router.post('/:productId', async (req, res) => {
    try {
        const { customerName, rating, comment } = req.body;
        if (!customerName || !rating) return res.status(400).json({ message: 'Name and rating required' });
        const review = new Review({ productId: req.params.productId, customerName, rating: parseInt(rating), comment: comment || '' });
        await review.save();
        res.status(201).json(review);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
