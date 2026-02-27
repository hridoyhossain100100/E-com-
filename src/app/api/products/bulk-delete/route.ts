import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Product from '@/models/Product';

export async function POST(req: Request) {
    try {
        const { verifyAdmin, unauthorizedResponse } = await import('@/lib/auth');
        const isAdmin = await verifyAdmin();
        if (!isAdmin) return unauthorizedResponse();

        await connectToDatabase();
        const body = await req.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ message: 'No product IDs provided' }, { status: 400 });
        }

        const result = await Product.deleteMany({ _id: { $in: ids } });

        return NextResponse.json({ message: `${result.deletedCount} products deleted` });

    } catch (error: any) {
        return NextResponse.json(
            { message: 'Failed to bulk delete products', error: error?.message },
            { status: 500 }
        );
    }
}
