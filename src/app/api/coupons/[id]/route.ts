import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Coupon from '@/models/Coupon';
import mongoose from 'mongoose';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { verifyAdmin, unauthorizedResponse } = await import('@/lib/auth');
        const isAdmin = await verifyAdmin();
        if (!isAdmin) return unauthorizedResponse();

        await connectToDatabase();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid coupon ID' }, { status: 400 });
        }

        const coupon = await Coupon.findByIdAndDelete(id);

        if (!coupon) {
            return NextResponse.json({ message: 'Coupon not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Coupon deleted' });

    } catch (error: any) {
        return NextResponse.json(
            { message: 'Failed to delete coupon', error: error?.message },
            { status: 500 }
        );
    }
}
