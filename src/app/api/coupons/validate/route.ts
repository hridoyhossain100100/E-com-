import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Coupon from '@/models/Coupon';

export async function POST(req: Request) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { code } = body;

        // @security-audit [injection]: Validate coupon code input to prevent NoSQL injection
        if (!code || typeof code !== 'string' || code.length > 50 || !/^[A-Za-z0-9_-]+$/.test(code.trim())) {
            return NextResponse.json({ message: 'Invalid coupon code format' }, { status: 400 });
        }

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
        console.error('Coupon validation error:', error);
        // @security-audit [sensitive-data-exposure]: Don't leak internal error details
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
