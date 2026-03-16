import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const query = req.nextUrl.searchParams.get('query')?.trim();

        if (!query) {
            return NextResponse.json({ message: 'Please provide a phone number or order number.' }, { status: 400 });
        }

        let orders;

        // Check if query is a number (order number)
        if (/^\d+$/.test(query)) {
            orders = await Order.find({
                $or: [
                    { orderNumber: parseInt(query) },
                    { customerPhone: { $regex: query, $options: 'i' } }
                ]
            }).sort({ date: -1 }).lean();
        } else {
            orders = await Order.find({
                customerPhone: { $regex: query, $options: 'i' }
            }).sort({ date: -1 }).lean();
        }

        return NextResponse.json(orders);
    } catch (error: unknown) {
        return NextResponse.json({ message: (error instanceof Error ? error.message : String(error)) || 'Server error' }, { status: 500 });
    }
}
