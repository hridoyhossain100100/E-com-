const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ["GET", "POST"],
    credentials: true
  }
});

let liveVisitors = 0;

io.on('connection', (socket) => {
  liveVisitors++;
  io.emit('visitorCount', liveVisitors);

  socket.on('disconnect', () => {
    liveVisitors--;
    io.emit('visitorCount', liveVisitors);
  });
});

// Rate Limiting
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { message: 'Too many requests, please try again later.' } });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { message: 'Too many login attempts.' } });
const orderLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { message: 'Too many orders, slow down.' } });

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(generalLimiter);

// Main route
app.get('/', (req, res) => { res.send('E-commerce API is running'); });

// Routes
app.use('/api/admin', loginLimiter, require('./routes/adminRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/checkout', require('./routes/orderRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));

// Shipping config endpoint (public)
app.get('/api/shipping', async (req, res) => {
  try {
    const Settings = require('./models/Settings');
    const zoneSetting = await Settings.findOne({ key: 'shippingZones' });
    const zones = zoneSetting ? zoneSetting.value : [
      { id: 'dhaka', label: 'Inside Dhaka', cost: 60 },
      { id: 'outside', label: 'Outside Dhaka', cost: 120 },
      { id: 'remote', label: 'Remote Area', cost: 180 }
    ];
    res.json({ zones, paymentMethods: ['bkash', 'nagad', 'rocket'] });
  } catch { res.status(500).json({ message: 'Error' }); }
});

// Sitemap.xml
app.get('/sitemap.xml', async (req, res) => {
  try {
    const Product = require('./models/Product');
    const products = await Product.find({}, '_id createdAt');
    const base = process.env.FRONTEND_URL || 'http://localhost:3000';
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    xml += `  <url><loc>${base}/</loc><priority>1.0</priority></url>\n`;
    xml += `  <url><loc>${base}/checkout</loc><priority>0.8</priority></url>\n`;
    products.forEach(p => { xml += `  <url><loc>${base}/product/${p._id}</loc><lastmod>${new Date(p.createdAt).toISOString()}</lastmod><priority>0.9</priority></url>\n`; });
    xml += '</urlset>';
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch { res.status(500).send('Error generating sitemap'); }
});

// Advanced analytics (Admin)
const authMiddleware = require('./middleware/authMiddleware');
app.get('/api/analytics/by-category', authMiddleware, async (req, res) => {
  try {
    const Order = require('./models/Order');
    const data = await Order.aggregate([
      { $unwind: '$products' },
      { $group: { _id: '$products.name', revenue: { $sum: { $multiply: ['$products.price', '$products.quantity'] } }, sold: { $sum: '$products.quantity' } } },
      { $sort: { revenue: -1 } }, { $limit: 10 }
    ]);
    res.json(data);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/analytics/completion-rate', authMiddleware, async (req, res) => {
  try {
    const Order = require('./models/Order');
    const total = await Order.countDocuments();
    const delivered = await Order.countDocuments({ status: 'delivered' });
    const pending = await Order.countDocuments({ status: 'pending' });
    const confirmed = await Order.countDocuments({ status: 'confirmed' });
    const shipped = await Order.countDocuments({ status: 'shipped' });
    res.json({ total, delivered, pending, confirmed, shipped, completionRate: total > 0 ? Math.round((delivered / total) * 100) : 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/analytics/repeat-customers', authMiddleware, async (req, res) => {
  try {
    const Order = require('./models/Order');
    const data = await Order.aggregate([
      { $group: { _id: '$customerPhone', name: { $first: '$customerName' }, orders: { $sum: 1 }, totalSpent: { $sum: '$totalAmount' } } },
      { $match: { orders: { $gt: 1 } } },
      { $sort: { orders: -1 } }, { $limit: 10 }
    ]);
    res.json(data);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Invoice endpoint (returns JSON for client-side PDF generation)
app.get('/api/invoice/:orderId', async (req, res) => {
  try {
    const Order = require('./models/Order');
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({
      orderNumber: order.orderNumber,
      date: order.createdAt,
      customer: { name: order.customerName, phone: order.customerPhone, address: order.customerAddress },
      products: order.products,
      totalAmount: order.totalAmount,
      couponCode: order.couponCode,
      discountAmount: order.discountAmount,
      payment: { method: order.paymentMethod || 'bkash', phone: order.bkashNumber, trxId: order.transactionId },
      status: order.status
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
