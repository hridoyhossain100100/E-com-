import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Review from '@/models/Review';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ productId: string }> }
) {
    try {
        await connectToDatabase();
        const { productId } = await params;

        const reviews = await Review.find({ productId }).sort({ createdAt: -1 });
        const avg = reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length : 0;

        return NextResponse.json({
            reviews,
            averageRating: Math.round(avg * 10) / 10,
            totalReviews: reviews.length
        });

    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to fetch reviews', error: error?.message }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ productId: string }> }
) {
    try {
        await connectToDatabase();
        const { productId } = await params;
        const body = await req.json();
        const { customerName, rating, comment } = body;

        if (!customerName || !rating) {
            return NextResponse.json({ message: 'Name and rating required' }, { status: 400 });
        }

        const review = new Review({
            productId,
            customerName,
            rating: parseInt(rating),
            comment: comment || ''
        });

        await review.save();
        return NextResponse.json(review, { status: 201 });

    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to add review', error: error?.message }, { status: 500 });
    }
}
