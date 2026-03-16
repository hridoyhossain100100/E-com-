import mongoose from 'mongoose';

// ──────────────────────────────────────────────
// Sub-schemas
// ──────────────────────────────────────────────

const attributeSchema = new mongoose.Schema({
    name:  { type: String, required: true },  // e.g. "RAM", "Color"
    value: { type: String, required: true }   // e.g. "8 GB", "Midnight Black"
}, { _id: false });

const variantSchema = new mongoose.Schema({
    label:       { type: String, required: true }, // e.g. "Red / XL"
    size:        { type: String, default: '' },
    color:       { type: String, default: '' },
    stock:       { type: Number, default: 0 },
    priceAdjust: { type: Number, default: 0 },     // +/- from base price
    sku:         { type: String, default: '' },     // per-variant SKU
    imageUrl:    { type: String, default: '' }      // variant-specific image
}, { _id: true });

// ──────────────────────────────────────────────
// Main product schema
// ──────────────────────────────────────────────

const productSchema = new mongoose.Schema({
    // ── Existing fields (unchanged) ──────────
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
    descriptionSections: [{
        title: String,
        content: String
    }],
    imageUrls: {
        type: [String],
        required: true
    },
    videoUrl: {
        type: String,
        default: ""
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
    },

    // ── New fields ───────────────────────────

    /** SEO-friendly URL slug, auto-generated from `name` if not set */
    slug: {
        type: String,
        unique: true,
        sparse: true,           // allows existing docs with no slug yet
        trim: true,
        lowercase: true
    },

    /** Soft-delete status */
    status: {
        type: String,
        enum: ['published', 'draft', 'archived'],
        default: 'published'
    },

    /** Simple on/off toggle for quick visibility control */
    isActive: {
        type: Boolean,
        default: true
    },

    /** Dynamic key-value attributes (RAM, Color, Size …) */
    attributes: {
        type: [attributeSchema],
        default: []
    },

    /** Lightweight tags for filtering / search */
    tags: {
        type: [String],
        default: []
    },

    /** Global product SKU */
    sku: {
        type: String,
        default: ''
    },

    /** Tracks the last update time */
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// ──────────────────────────────────────────────
// Indexes
// ──────────────────────────────────────────────

// @database-optimizer: Existing indexes (unchanged)
productSchema.index({ category: 1, createdAt: -1 }); // Category filter + sort by newest
productSchema.index({ name: 'text', description: 'text' }); // Full-text search
productSchema.index({ createdAt: -1 }); // Sort by newest (homepage)
productSchema.index({ stock: 1 }); // Filter in-stock products

// @database-optimizer: New indexes for future-proof queries
productSchema.index({ status: 1 });                            // Filter by status
productSchema.index({ isActive: 1 });                          // Active / inactive filter
productSchema.index({ tags: 1 });                              // Tag-based filtering
productSchema.index({ 'attributes.name': 1, 'attributes.value': 1 }); // Dynamic attribute queries

// ──────────────────────────────────────────────
// Pre-save hook — auto-generate slug & updatedAt
// ──────────────────────────────────────────────

productSchema.pre('save', async function () {
    // Auto-set updatedAt on every save
    this.updatedAt = new Date();

    // Only generate slug when it is missing or the name changed
    if (!this.slug || this.isModified('name')) {
        const base = (this.name || '')
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')   // strip non-word chars
            .replace(/[\s_]+/g, '-')    // spaces / underscores → hyphens
            .replace(/-+/g, '-')        // collapse multiple hyphens
            .replace(/^-|-$/g, '');     // trim leading / trailing hyphens

        // Collision avoidance: append a short suffix if slug already taken
        let candidate = base;
        let attempt = 0;
        const ProductModel = this.constructor as mongoose.Model<typeof this>;

        while (true) {
            const existing = await ProductModel.findOne({
                slug: candidate,
                _id: { $ne: this._id }
            });
            if (!existing) break;
            attempt++;
            candidate = `${base}-${attempt}`;
        }

        this.slug = candidate;
    }
});

// ──────────────────────────────────────────────
// Model export (safe for Next.js hot reloads)
// ──────────────────────────────────────────────

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;
