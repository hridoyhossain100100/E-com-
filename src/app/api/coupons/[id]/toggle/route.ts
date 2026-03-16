import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Coupon from '@/models/Coupon';
import mongoose from 'mongoose';

export async function PUT(
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

        const coupon = await Coupon.findById(id);

        if (!coupon) {
            return NextResponse.json({ message: 'Coupon not found' }, { status: 404 });
        }

        coupon.isActive = !coupon.isActive;
        await coupon.save();

        return NextResponse.json(coupon);

    } catch (error: unknown) {
        return NextResponse.json(
            { message: 'Failed to toggle coupon status', error: (error instanceof Error ? error.message : String(error)) },
            { status: 500 }
        );
    }
}
