import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';

export async function GET() {
    try {
        const { verifyAdmin, unauthorizedResponse } = await import('@/lib/auth');
        const isAdmin = await verifyAdmin();
        if (!isAdmin) return unauthorizedResponse();

        await connectToDatabase();

        const orders = await Order.find({ status: { $ne: 'cancelled' } }).populate('products.productId');
        const catMap: Record<string, number> = {};

        for (const order of orders) {
            for (const item of order.products) {
                try {
                    const product = await Product.findById(item.productId);
                    const cat = product?.category || 'General';
                    catMap[cat] = (catMap[cat] || 0) + (item.price * item.quantity);
                } catch {
                    // Skip if product got deleted
                }
            }
        }

        const data = Object.keys(catMap).map(k => ({ name: k, value: catMap[k] }));
        return NextResponse.json(data);

    } catch (error: unknown) {
        return NextResponse.json(
            { message: 'Failed to fetch category analytics', error: (error instanceof Error ? error.message : String(error)) },
            { status: 500 }
        );
    }
}
