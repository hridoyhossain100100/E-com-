import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    customerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

// @database-optimizer: Indexes for product review queries
reviewSchema.index({ productId: 1, createdAt: -1 }); // Product reviews sorted by newest
reviewSchema.index({ productId: 1, rating: -1 }); // Product reviews sorted by rating
reviewSchema.index({ createdAt: -1 }); // Admin review listing

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

export default Review;
