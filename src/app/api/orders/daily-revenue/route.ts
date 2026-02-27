import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';

export async function GET() {
    try {
        const { verifyAdmin, unauthorizedResponse } = await import('@/lib/auth');
        const isAdmin = await verifyAdmin();
        if (!isAdmin) return unauthorizedResponse();

        await connectToDatabase();

        const last14Days = Array.from({ length: 14 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const results = await Order.aggregate([
            {
                $match: {
                    status: { $ne: 'cancelled' },
                    createdAt: {
                        $gte: new Date(new Date().setDate(new Date().getDate() - 14))
                    }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$totalAmount" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const chartData = last14Days.map(date => {
            const dayData = results.find(r => r._id === date);
            return {
                date,
                revenue: dayData ? dayData.revenue : 0,
                orders: dayData ? dayData.orders : 0
            };
        });

        return NextResponse.json(chartData);

    } catch (error: any) {
        return NextResponse.json(
            { message: 'Failed to fetch daily revenue', error: error?.message },
            { status: 500 }
        );
    }
}
