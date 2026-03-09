import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    discountPercent: {
        type: Number,
        required: true,
        min: 1,
        max: 100
    },
    maxDiscount: {
        type: Number,
        default: 0
    },
    usageLimit: {
        type: Number,
        default: 0
    },
    usedCount: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// @database-optimizer: Indexes for coupon validation queries
couponSchema.index({ code: 1, isActive: 1 }); // Fast coupon lookup during checkout
couponSchema.index({ expiresAt: 1 }); // Expired coupon cleanup queries
couponSchema.index({ isActive: 1, createdAt: -1 }); // Admin listing active coupons

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);

export default Coupon;
