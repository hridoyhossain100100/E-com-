import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Coupon from '@/models/Coupon';

export async function GET() {
    try {
        const { verifyAdmin, unauthorizedResponse } = await import('@/lib/auth');
        const isAdmin = await verifyAdmin();
        if (!isAdmin) return unauthorizedResponse();

        await connectToDatabase();
        const coupons = await Coupon.find().sort({ createdAt: -1 });

        return NextResponse.json(coupons);
    } catch (error: any) {
        return NextResponse.json(
            { message: 'Failed to fetch coupons', error: error?.message },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const { verifyAdmin, unauthorizedResponse } = await import('@/lib/auth');
        const isAdmin = await verifyAdmin();
        if (!isAdmin) return unauthorizedResponse();

        await connectToDatabase();
        const body = await req.json();
        const { code, discountPercent, maxDiscount, usageLimit, expiresAt } = body;

        if (!code || !discountPercent) {
            return NextResponse.json({ message: 'Code and discount percent are required' }, { status: 400 });
        }

        const coupon = new Coupon({
            code: code.toUpperCase().trim(),
            discountPercent,
            maxDiscount: maxDiscount || 0,
            usageLimit: usageLimit || 0,
            expiresAt: expiresAt || null
        });

        const saved = await coupon.save();
        return NextResponse.json(saved, { status: 201 });

    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json({ message: 'Coupon code already exists' }, { status: 400 });
        }
        return NextResponse.json(
            { message: 'Failed to create coupon', error: error?.message },
            { status: 500 }
        );
    }
}
