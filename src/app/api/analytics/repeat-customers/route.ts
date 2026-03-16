import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';

export async function GET() {
    try {
        const { verifyAdmin, unauthorizedResponse } = await import('@/lib/auth');
        const isAdmin = await verifyAdmin();
        if (!isAdmin) return unauthorizedResponse();

        await connectToDatabase();

        const pipeline = [
            { $group: { _id: "$customerPhone", count: { $sum: 1 } } },
            { $group: { _id: "$count", totalCustomers: { $sum: 1 } } }
        ];

        const stats = await Order.aggregate(pipeline);

        const single = stats.find(s => s._id === 1)?.totalCustomers || 0;
        const total = stats.reduce((sum, s) => sum + s.totalCustomers, 0);
        const repeat = total - single;

        return NextResponse.json([
            { name: 'First Time', value: single },
            { name: 'Repeat', value: repeat }
        ]);

    } catch (error: unknown) {
        return NextResponse.json(
            { message: 'Failed to fetch repeat customers', error: (error instanceof Error ? error.message : String(error)) },
            { status: 500 }
        );
    }
}
