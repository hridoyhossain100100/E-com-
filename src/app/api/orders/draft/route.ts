import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';

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
            products,
            customerName,
            customerPhone,
            totalAmount,
            draftOrderId
        } = body;

        // Fetch product details to store correct pricing, exactly like normal checkout
        const orderProducts = [];
        if (products && Array.isArray(products)) {
            for (const item of products) {
                if (!item.productId) continue;
                const product = await Product.findById(item.productId);
                if (product) {
                    orderProducts.push({
                        productId: product._id,
                        name: product.name,
                        price: product.price,
                        quantity: item.quantity || 1,
                        // Snapshot at order time — immune to future product edits
                        productImage: product.imageUrls?.[0] || '',
                        category: product.category || ''
                    });
                }
            }
        }

        // If a draft exists, update it instead of creating a new one
        if (draftOrderId) {
            const existingOrder = await Order.findById(draftOrderId);
            if (existingOrder && existingOrder.status === 'incomplete') {
                if (customerName) existingOrder.customerName = customerName;
                if (customerPhone) existingOrder.customerPhone = customerPhone;
                // Only update products if provided, otherwise keep existing
                if (orderProducts.length > 0) {
                    existingOrder.products = orderProducts;
                }
                if (totalAmount !== undefined) {
                    existingOrder.totalAmount = totalAmount;
                }

                await existingOrder.save();
                return NextResponse.json({ message: 'Draft updated', orderId: existingOrder._id }, { status: 200 });
            }
        }

        // Create new draft
        const orderNumber = await generateOrderNumber();
        const newOrder = new Order({
            products: orderProducts,
            orderNumber,
            totalAmount: totalAmount || 0,
            customerName: customerName || '',
            customerPhone: customerPhone || '',
            status: 'incomplete', // Explicitly incomplete
            customerAddress: '', // Not required yet
        });

        const savedOrder = await newOrder.save();

        return NextResponse.json({ message: 'Draft created', orderId: savedOrder._id }, { status: 201 });

    } catch (error) {
        console.error('Draft Order Error:', error);
        return NextResponse.json({ message: 'Internal server error while saving draft' }, { status: 500 });
    }
}
