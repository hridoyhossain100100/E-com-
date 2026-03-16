import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Review from '@/models/Review';
import { verifyAdmin } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('admin_token')?.value;

        if (!token || !(await verifyAdmin())) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const deletedReview = await Review.findByIdAndDelete(id);

        if (!deletedReview) {
            return NextResponse.json({ message: 'Review not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Review deleted successfully' }, { status: 200 });
    } catch (error: unknown) {
        return NextResponse.json({ message: (error instanceof Error ? error.message : String(error)) || 'Server error' }, { status: 500 });
    }
}
