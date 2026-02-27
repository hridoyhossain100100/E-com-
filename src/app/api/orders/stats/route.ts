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

        const latestOrders = await Order.find().sort({ createdAt: -1 }).limit(10);

        const [totalOrders, pendingOrders, totalProducts, revenueResult] = await Promise.all([
            Order.countDocuments(),
            Order.countDocuments({ status: 'pending' }),
            Product.countDocuments(),
            Order.aggregate([
                { $match: { status: { $ne: 'cancelled' } } },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ])
        ]);

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        return NextResponse.json({
            totalOrders,
            pendingOrders,
            totalRevenue,
            totalProducts,
            latestOrders
        });

    } catch (error: any) {
        return NextResponse.json(
            { message: 'Failed to fetch dashboard stats', error: error?.message },
            { status: 500 }
        );
    }
}
