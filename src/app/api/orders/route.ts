import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';
import axios from 'axios';

const generateOrderNumber = async () => {
    let orderNumber;
    let isUnique = false;
    while (!isUnique) {
        orderNumber = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
        const existingOrder = await Order.findOne({ orderNumber });
        if (!existingOrder) {
            isUnique = true;
        }
    }
    return orderNumber;
};

export async function POST(req: Request) {
    try {
        await connectToDatabase();
        const body = await req.json();

        const {
            products, // Array of { productId, quantity }
            customerName,
            customerPhone,
            customerAddress,
            bkashNumber,
            transactionId,
            couponCode,
            discountAmount,
            paymentMethod,
            shippingZone,
            shippingCost
        } = body;

        // Basic Backend Validation (matching Express logic)
        if (!products || products.length === 0) {
            return NextResponse.json({ message: 'Cart is empty' }, { status: 400 });
        }
        if (!customerName || !customerPhone || !customerAddress) {
            return NextResponse.json({ message: 'Customer details are required' }, { status: 400 });
        }
        if (paymentMethod !== 'cod' && (!bkashNumber || !transactionId)) {
            return NextResponse.json({ message: 'Payment details are required for this payment method' }, { status: 400 });
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
                quantity: item.quantity
            });
        }

        // Calculate final total (Products + Shipping - Discount)
        let finalTotal = calculatedTotal + (Number(shippingCost) || 0) - (Number(discountAmount) || 0);
        if (finalTotal < 0) finalTotal = 0;

        const orderNumber = await generateOrderNumber();

        const newOrder = new Order({
            products: orderProducts,
            orderNumber,
            totalAmount: finalTotal,
            customerName,
            customerPhone,
            customerAddress,
            bkashNumber: paymentMethod === 'cod' ? '' : bkashNumber,
            transactionId: paymentMethod === 'cod' ? '' : transactionId,
            couponCode,
            discountAmount,
            paymentMethod,
            shippingZone,
            shippingCost,
            status: 'pending'
        });

        const savedOrder = await newOrder.save();

        // Send Discord Webhook Notification
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (webhookUrl) {
            try {
                const productList = orderProducts
                    .map(p => `Prodcut name : ${p.name}\nQty: ${p.quantity} | Unit Price: ৳${Number(p.price).toLocaleString()}`)
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
${paymentMethod === 'cod' ? '🏠 Cash on Delivery (COD)' : `📱 ${(paymentMethod || 'bkash').charAt(0).toUpperCase() + (paymentMethod || 'bkash').slice(1)} Phone: \`${bkashNumber}\`\n📄 TrxID: \`${transactionId}\``}
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

        let query: any = {};

        if (search) {
            const orConditions: any[] = [
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

    } catch (error: any) {
        console.error('Failed to fetch orders:', error);
        return NextResponse.json(
            { message: 'Internal Server Error', error: error?.message },
            { status: 500 }
        );
    }
}
