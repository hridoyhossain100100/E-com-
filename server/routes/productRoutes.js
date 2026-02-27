const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/authMiddleware');

// Multer setup — store file in memory for upload to ImgBB
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper: Upload a single file buffer to ImgBB
async function uploadToImgBB(fileBuffer) {
    const base64Image = fileBuffer.toString('base64');
    const formData = new FormData();
    formData.append('key', process.env.IMGBB_API_KEY);
    formData.append('image', base64Image);
    const res = await axios.post('https://api.imgbb.com/1/upload', formData, { headers: formData.getHeaders() });
    return res.data.data.display_url;
}

// GET all products
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET single product
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create product (Admin)
router.post('/', authMiddleware, upload.array('images', 10), async (req, res) => {
    try {
        const { name, price, description, category, stock, variants } = req.body;
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'At least one image is required' });
        }

        const imageUrls = await Promise.all(req.files.map(f => uploadToImgBB(f.buffer)));

        const product = new Product({
            name,
            price: parseFloat(price),
            description,
            imageUrls,
            category: category || 'General',
            stock: parseInt(stock) || 0,
            variants: variants ? JSON.parse(variants) : []
        });

        const savedProduct = await product.save();
        res.status(201).json(savedProduct);
    } catch (err) {
        console.error('Product creation error:', err.response?.data || err.message);
        res.status(500).json({ message: 'Failed to create product', error: err.message });
    }
});

// PUT edit product (Admin) — update text fields, variants, and optionally images
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { name, price, description, category, stock, variants, imageUrls } = req.body;
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (price !== undefined) updateData.price = parseFloat(price);
        if (description !== undefined) updateData.description = description;
        if (category !== undefined) updateData.category = category;
        if (stock !== undefined) updateData.stock = parseInt(stock);
        if (variants !== undefined) updateData.variants = typeof variants === 'string' ? JSON.parse(variants) : variants;
        if (imageUrls !== undefined) updateData.imageUrls = imageUrls; // for removing images

        const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update product', error: err.message });
    }
});

// POST add images to existing product (Admin)
router.post('/:id/images', authMiddleware, upload.array('images', 10), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No images provided' });
        }

        const newUrls = await Promise.all(req.files.map(f => uploadToImgBB(f.buffer)));
        product.imageUrls.push(...newUrls);
        await product.save();
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: 'Failed to add images', error: err.message });
    }
});

// DELETE product (Admin)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST bulk delete products (Admin)
router.post('/bulk-delete', authMiddleware, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No product IDs provided' });
        }
        const result = await Product.deleteMany({ _id: { $in: ids } });
        res.json({ message: `${result.deletedCount} products deleted` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
