import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Coupon from '@/models/Coupon';

export async function POST(req: Request) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { code } = body;

        const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), isActive: true });

        if (!coupon) {
            return NextResponse.json({ message: 'Invalid or expired coupon' }, { status: 404 });
        }

        if (coupon.expiresAt && new Date() > coupon.expiresAt) {
            return NextResponse.json({ message: 'Coupon has expired' }, { status: 400 });
        }

        if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
            return NextResponse.json({ message: 'Coupon usage limit reached' }, { status: 400 });
        }

        return NextResponse.json({
            code: coupon.code,
            discountPercent: coupon.discountPercent,
            maxDiscount: coupon.maxDiscount
        });

    } catch (error: any) {
        return NextResponse.json(
            { message: 'Internal Server Error', error: error?.message },
            { status: 500 }
        );
    }
}
