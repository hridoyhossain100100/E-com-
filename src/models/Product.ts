import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
    label: { type: String, required: true }, // e.g. "Red / XL"
    size: { type: String, default: '' },
    color: { type: String, default: '' },
    stock: { type: Number, default: 0 },
    priceAdjust: { type: Number, default: 0 } // +/- from base price
}, { _id: true });

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    imageUrls: {
        type: [String],
        required: true
    },
    category: {
        type: String,
        default: 'General'
    },
    stock: {
        type: Number,
        default: 0
    },
    variants: {
        type: [variantSchema],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Avoid OverwriteModelError during Next.js hot reloads
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;
