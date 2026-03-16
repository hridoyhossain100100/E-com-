import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Coupon from '@/models/Coupon';
import axios from 'axios';
import { sendPushNotification } from '@/lib/pushNotification';
import { z } from 'zod';

// --- SECURITY LAYERS ---

// 1. Zod Validation
const orderSchema = z.object({
    customerName: z.string().min(2, 'Valid customer name is required (min 2 chars)'),
    customerPhone: z.string().regex(/^01[3-9]\d{8}$/, 'Valid Bangladesh phone number is required (01XXXXXXXXX)'),
    customerAddress: z.string().min(5, 'Valid delivery address is required (min 5 chars)'),
    products: z.array(z.any()).min(1, 'Cart is empty'),
    couponCode: z.string().optional().nullable(),
    discountAmount: z.number().optional().nullable(),
    paymentMethod: z.string().optional().nullable(),
    shippingZone: z.string().optional().nullable(),
    shippingCost: z.number().optional().nullable(),
    draftOrderId: z.string().optional().nullable()
}).passthrough();

// 2. IP-Based Rate Limiting (In-memory)
// Max 3 requests per day (24 hours) per IP
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record) {
        rateLimitMap.set(ip, { count: 1, windowStart: now });
        return false;
    }

    if (now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
        // Reset window
        rateLimitMap.set(ip, { count: 1, windowStart: now });
        return false;
    }

    if (record.count >= MAX_REQUESTS_PER_WINDOW) {
        return true;
    }

    record.count += 1;
    return false;
}

// --- END SECURITY LAYERS ---

// Atomic order number generation using findOneAndUpdate to prevent race conditions
const generateOrderNumber = async () => {
    const mongoose = await import('mongoose');
    const CounterSchema = new mongoose.default.Schema({ _id: String, seq: { type: Number, default: 100000 } });
    const Counter = mongoose.default.models.Counter || mongoose.default.model('Counter', CounterSchema);
    const counter = await Counter.findOneAndUpdate(
        { _id: 'orderNumber' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
};

export async function POST(req: Request) {
    try {
        // Apply Rate Limiting
        const forwardedFor = req.headers.get('x-forwarded-for');
        const realIp = req.headers.get('x-real-ip');
        const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'unknown');
        
        if (ip !== 'unknown' && isRateLimited(ip)) {
            return NextResponse.json({ message: 'Too many order requests. Maximum 3 requests per day.' }, { status: 429 });
        }

        await connectToDatabase();
        const body = await req.json();

        // Apply Zod Validation
        const validationResult = orderSchema.safeParse(body);
        if (!validationResult.success) {
            // Return first error message
            const errorMessage = validationResult.error.issues[0]?.message || 'Invalid input data';
            return NextResponse.json({ message: errorMessage }, { status: 400 });
        }

        const {
            products, // Array of { productId, quantity }
            customerName,
            customerPhone,
            customerAddress,
            couponCode,
            discountAmount,
            paymentMethod,
            shippingZone,
            shippingCost,
            draftOrderId // [NEW] Optional draft order ID
        } = body;

        // @nodejs-best-practices & @security-audit: Input validation at boundary
        if (!products || !Array.isArray(products) || products.length === 0) {
            return NextResponse.json({ message: 'Cart is empty' }, { status: 400 });
        }
        if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
            return NextResponse.json({ message: 'Valid customer name is required (min 2 chars)' }, { status: 400 });
        }
        if (!customerPhone || typeof customerPhone !== 'string' || !/^01[3-9]\d{8}$/.test(customerPhone.trim())) {
            return NextResponse.json({ message: 'Valid Bangladesh phone number is required (01XXXXXXXXX)' }, { status: 400 });
        }
        if (!customerAddress || typeof customerAddress !== 'string' || customerAddress.trim().length < 5) {
            return NextResponse.json({ message: 'Valid delivery address is required (min 5 chars)' }, { status: 400 });
        }
        // @security-audit: Validate product quantities to prevent negative/zero values
        for (const item of products) {
            if (!item.productId || !item.quantity || item.quantity < 1 || !Number.isInteger(item.quantity)) {
                return NextResponse.json({ message: 'Invalid product quantity' }, { status: 400 });
            }
        }

        // Fetch product details from DB and calculate total to prevent tampering
        let calculatedTotal = 0;
        const orderProducts = [];

        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return NextResponse.json({ message: `Product ${item.productId} not found` }, { status: 404 });
            }
            if (product.stock < item.quantity) {
                return NextResponse.json({ message: `Not enough stock for ${product.name}` }, { status: 400 });
            }

            // Deduct stock
            product.stock -= item.quantity;
            await product.save();

            const itemTotal = product.price * item.quantity;
            calculatedTotal += itemTotal;

            orderProducts.push({
                productId: product._id,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                // Snapshot at order time — immune to future product edits
                productImage: product.imageUrls?.[0] || '',
                category: product.category || ''
            });
        }

        // Calculate final total (Products - Discount)
        let finalTotal = calculatedTotal - (Number(discountAmount) || 0);
        if (finalTotal < 0) finalTotal = 0;

        // [NEW] Use draft order if it exists
        let savedOrder;
        let orderNumber;

        if (draftOrderId) {
            const existingOrder = await Order.findById(draftOrderId);
            if (existingOrder && existingOrder.status === 'incomplete') {
                existingOrder.products = orderProducts;
                existingOrder.totalAmount = finalTotal;
                existingOrder.customerName = customerName;
                existingOrder.customerPhone = customerPhone;
                existingOrder.customerAddress = customerAddress;
                existingOrder.couponCode = couponCode;
                existingOrder.discountAmount = discountAmount;
                existingOrder.paymentMethod = paymentMethod;
                existingOrder.shippingZone = shippingZone;
                existingOrder.shippingCost = shippingCost;
                existingOrder.status = 'pending';

                savedOrder = await existingOrder.save();

                // For webhook backward compatibility, pass orderNumber
                orderNumber = existingOrder.orderNumber;
            }
        }

        if (!savedOrder) {
            orderNumber = await generateOrderNumber();
            const newOrder = new Order({
                products: orderProducts,
                orderNumber,
                totalAmount: finalTotal,
                customerName,
                customerPhone,
                customerAddress,
                couponCode,
                discountAmount,
                paymentMethod,
                shippingZone,
                shippingCost,
                status: 'pending'
            });
            savedOrder = await newOrder.save();
        }

        // Send Discord Webhook Notification
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (webhookUrl) {
            try {
                const productList = orderProducts
                    .map(p => `Product name : ${p.name}\nQty: ${p.quantity} | Unit Price: ৳${Number(p.price).toLocaleString()}`)
                    .join('\n');

                let discountLine = '';
                if (couponCode && discountAmount > 0) {
                    discountLine = `\n🎫 Coupon: \`${couponCode}\` (-৳${Number(discountAmount || 0).toLocaleString()})`;
                }

                const exactDescription = `**A new standard order has been logged from the ShopVibe store.**

👤 Customer Name: \`${customerName}\`
📞 : \`${customerPhone}\`

📦 Order Summary:

${productList}
💰 Total Amount: ৳${Number(finalTotal).toLocaleString()}${discountLine}

📍 Delivery Address: ${customerAddress}

💳 Payment Details:
🏠 Cash on Delivery (COD)
🆔 Order ID: \`${savedOrder._id.toString()}\``;

                const discordMessage = {
                    content: "@here 🚨 **New Order Received!**",
                    embeds: [{
                        title: `🎉 Premium Order Confirmed! (Order #${orderNumber})`,
                        description: exactDescription,
                        color: 0x00d28a,
                        footer: { text: '⚡ ShopVibe Systems • Processed with Captain Hook APP' },
                        timestamp: new Date().toISOString()
                    }]
                };

                await axios.post(webhookUrl, discordMessage);
            } catch (webhookError) {
                console.error('Discord Webhook Failed:', webhookError);
                // Do not fail the order if webhook fails
            }
        }

        // Send Push Notification to Admin App
        try {
            await sendPushNotification(
                'New Order Received! 🚀',
                `Order #${orderNumber} from ${customerName} for ৳${Number(finalTotal).toLocaleString()}`,
                { orderId: savedOrder._id.toString(), type: 'new_order' }
            );
        } catch (notificationError) {
            console.error('Push Notification Failed:', notificationError);
            // Do not fail the order if notification fails
        }

        // Increment coupon usage if coupon was applied
        if (couponCode) {
            try {
                await Coupon.findOneAndUpdate(
                    { code: couponCode.toUpperCase() },
                    { $inc: { usedCount: 1 } }
                );
            } catch (couponErr) {
                console.error('Failed to increment coupon usage:', couponErr);
            }
        }

        return NextResponse.json({ message: 'Order placed successfully', order: savedOrder }, { status: 201 });

    } catch (error) {
        console.error('Checkout Error:', error);
        return NextResponse.json({ message: 'Internal server error while placing order' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { verifyAdmin, unauthorizedResponse } = await import('@/lib/auth');
        const isAdmin = await verifyAdmin();
        if (!isAdmin) return unauthorizedResponse();

        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query: Record<string, any> = {};

        if (search) {
            const orConditions: Record<string, unknown>[] = [
                { customerName: { $regex: search, $options: 'i' } },
                { customerPhone: { $regex: search, $options: 'i' } }
            ];
            if (!isNaN(Number(search))) {
                orConditions.push({ orderNumber: Number(search) });
            }
            query.$or = orConditions;
        }

        if (status) {
            query.status = status;
        }

        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Order.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / limit);
        return NextResponse.json({
            orders,
            total,
            totalPages,
            pages: totalPages,
            currentPage: page
        });

    } catch (error: unknown) {
        console.error('Failed to fetch orders:', error);
        return NextResponse.json(
            { message: 'Internal Server Error', error: (error instanceof Error ? error.message : String(error)) },
            { status: 500 }
        );
    }
}
