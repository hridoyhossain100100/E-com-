import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            name: String,
            price: Number,
            quantity: {
                type: Number,
                default: 1
            }
        }
    ],
    orderNumber: {
        type: Number,
        required: true,
        unique: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    customerName: {
        type: String,
        required: false // Optional for initial draft
    },
    customerPhone: {
        type: String,
        required: false // Optional for very early drafts
    },
    customerAddress: {
        type: String,
        required: false // Optional for draft orders
    },
    couponCode: {
        type: String,
        default: null
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    paymentMethod: {
        type: String,
        enum: ['nagad', 'rocket', 'cod'],
        default: 'cod'
    },
    shippingZone: {
        type: String,
        default: 'dhaka'
    },
    shippingCost: {
        type: Number,
        default: 60
    },
    consignmentId: {
        type: String,
        default: null
    },
    pathaoStatus: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['incomplete', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
// @database-optimizer: Add indexes for common query patterns
orderSchema.index({ orderNumber: 1 }, { unique: true }); // Fast order lookup by number
orderSchema.index({ customerPhone: 1 }); // Customer order history by phone
orderSchema.index({ status: 1, createdAt: -1 }); // Admin filter by status + sort
orderSchema.index({ createdAt: -1 }); // Sort by newest (admin dashboard)
orderSchema.index({ consignmentId: 1 }); // Pathao tracking lookup
// Index for cleaning up old incomplete orders easily
orderSchema.index({ createdAt: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60, partialFilterExpression: { status: 'incomplete' } });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default Order;
