const express = require('express');
const router = express.Router();
const axios = require('axios');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const authMiddleware = require('../middleware/authMiddleware');

// POST checkout — save order and send Discord webhook
router.post('/', async (req, res) => {
    try {
        const { products, totalAmount, customerName, customerPhone, customerAddress, bkashNumber, transactionId, couponCode, discountAmount, paymentMethod, shippingZone, shippingCost } = req.body;

        if (!products || !totalAmount || !customerName || !customerPhone || !customerAddress) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // For non-COD orders, bkash/nagad/rocket details are required
        if (paymentMethod !== 'cod' && (!bkashNumber || !transactionId)) {
            return res.status(400).json({ message: 'Payment number and transaction ID are required' });
        }

        // Check stock
        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (product && product.stock < item.quantity) {
                return res.status(400).json({ message: `${product.name} is out of stock (Available: ${product.stock})` });
            }
        }

        // Generate order number
        const count = await Order.countDocuments();
        const orderNumber = count + 1;

        const order = new Order({
            products,
            totalAmount,
            customerName,
            customerPhone,
            customerAddress,
            bkashNumber: bkashNumber || '',
            transactionId: transactionId || '',
            orderNumber,
            couponCode: couponCode || null,
            discountAmount: discountAmount || 0,
            paymentMethod: paymentMethod || 'bkash',
            shippingZone: shippingZone || 'dhaka',
            shippingCost: shippingCost || 60
        });

        const savedOrder = await order.save();

        // Decrement stock
        for (const item of products) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -(item.quantity || 1) } });
        }

        // Increment coupon usage
        if (couponCode) {
            await Coupon.findOneAndUpdate({ code: couponCode.toUpperCase() }, { $inc: { usedCount: 1 } });
        }

        // Discord Webhook
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (webhookUrl) {
            const productList = products
                .map(p => `Prodcut name : ${p.name}\nQty: ${p.quantity} | Unit Price: ৳${Number(p.price).toLocaleString()}`)
                .join('\n');

            let discountLine = '';
            if (couponCode && discountAmount > 0) {
                discountLine = `\n🎫 Coupon: \`${couponCode}\` (-৳${Number(discountAmount).toLocaleString()})`;
            }

            const exactDescription = `**A new standard order has been logged from the ShopVibe store.**

👤 Customer Name: \`${customerName}\`
📞 : \`${customerPhone}\`

📦 Order Summary:

${productList}
💰 Total Amount: ৳${Number(totalAmount).toLocaleString()}${discountLine}

📍 Delivery Address: ${customerAddress}

💳 Payment Details:
${paymentMethod === 'cod' ? '🏠 Cash on Delivery (COD)' : `📱 ${(paymentMethod || 'bkash').charAt(0).toUpperCase() + (paymentMethod || 'bkash').slice(1)} Phone: \`${bkashNumber}\`\n📄 TrxID: \`${transactionId}\``}
🆔 Order ID: \`${savedOrder._id.toString()}\``;

            const discordPayload = {
                content: "@here 🚨 **New Order Received!**",
                embeds: [{
                    title: `🎉 Premium Order Confirmed! (Order #${orderNumber})`,
                    description: exactDescription,
                    color: 0x00d28a,
                    footer: { text: '⚡ ShopVibe Systems • Processed with Captain Hook APP' },
                    timestamp: new Date().toISOString()
                }]
            };

            try { await axios.post(webhookUrl, discordPayload); }
            catch (webhookErr) { console.error('Discord webhook error:', webhookErr.message); }
        }

        res.status(201).json({ message: 'Order placed successfully!', order: savedOrder });
    } catch (err) {
        console.error('Checkout error:', err.message);
        res.status(500).json({ message: 'Failed to place order', error: err.message });
    }
});

// GET track order (Public)
router.get('/track', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ message: 'Please provide an Order ID or Phone Number' });
        }

        // Try searching by exact Order ID (Mongo ObjectId) or Phone Number
        const filter = {
            $or: [
                { customerPhone: query }
            ]
        };

        // If it looks like a Mongo ID, add it to the OR query
        if (query.match(/^[0-9a-fA-F]{24}$/)) {
            filter.$or.push({ _id: query });
        }

        // If it looks like a short order number (e.g. 1 2 3)
        if (!isNaN(query)) {
            filter.$or.push({ orderNumber: parseInt(query) });
        }

        const orders = await Order.find(filter).sort({ createdAt: -1 });

        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: 'No orders found matching this information.' });
        }

        // Return a safe subset of the order data for public tracking
        const safeOrders = orders.map(o => ({
            _id: o._id,
            orderNumber: o.orderNumber,
            date: o.createdAt,
            totalAmount: o.totalAmount,
            status: o.status,
            products: o.products.map(p => ({ name: p.name, quantity: p.quantity }))
        }));

        res.json(safeOrders);
    } catch (err) {
        console.error('Track Order Error:', err.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// GET admin stats (Admin) — MUST be before /:id routes
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const revenueResult = await Order.aggregate([
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
        const totalProducts = await Product.countDocuments();
        res.json({ totalOrders, totalRevenue, totalProducts });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET daily revenue for chart (Admin) — last 14 days
router.get('/daily-revenue', authMiddleware, async (req, res) => {
    try {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const data = await Order.aggregate([
            { $match: { createdAt: { $gte: fourteenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    revenue: { $sum: '$totalAmount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill in missing days with 0
        const result = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const found = data.find(item => item._id === dateStr);
            result.push({
                date: dateStr,
                label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                revenue: found ? found.revenue : 0,
                count: found ? found.count : 0
            });
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET export orders as CSV (Admin)
router.get('/export-csv', authMiddleware, async (req, res) => {
    try {
        const { status, from, to } = req.query;
        const filter = {};
        if (status && status !== 'all') filter.status = status;
        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to) filter.createdAt.$lte = new Date(to + 'T23:59:59');
        }

        const orders = await Order.find(filter).sort({ createdAt: -1 });

        const header = 'Order#,Date,Customer,Phone,Address,Products,Total,Bkash,TrxID,Status,Coupon,Discount\n';
        const rows = orders.map(o => {
            const prods = o.products.map(p => `${p.name}x${p.quantity}`).join('; ');
            const date = new Date(o.createdAt).toLocaleDateString();
            return `${o.orderNumber},"${date}","${o.customerName}","${o.customerPhone}","${o.customerAddress.replace(/"/g, '""')}","${prods}",${o.totalAmount},"${o.bkashNumber}","${o.transactionId}",${o.status},${o.couponCode || ''},${o.discountAmount || 0}`;
        }).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
        res.send(header + rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET all orders (Admin) — with search & filter
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { search, status, page = 1, limit = 12 } = req.query;
        const filter = {};

        if (status && status !== 'all') filter.status = status;
        if (search) {
            const regex = new RegExp(search, 'i');
            filter.$or = [
                { customerName: regex },
                { customerPhone: regex },
                { transactionId: regex },
                { bkashNumber: regex }
            ];
        }

        const total = await Order.countDocuments(filter);
        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        res.json({ orders, total, pages: Math.ceil(total / parseInt(limit)) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT update order status (Admin)
router.put('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
