const mongoose = require('mongoose');

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
        required: true
    },
    customerPhone: {
        type: String,
        required: true
    },
    customerAddress: {
        type: String,
        required: true
    },
    bkashNumber: {
        type: String,
        default: ''
    },
    transactionId: {
        type: String,
        default: ''
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
        enum: ['bkash', 'nagad', 'rocket', 'cod'],
        default: 'bkash'
    },
    shippingZone: {
        type: String,
        default: 'dhaka'
    },
    shippingCost: {
        type: Number,
        default: 60
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'shipped', 'delivered'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Order', orderSchema);
