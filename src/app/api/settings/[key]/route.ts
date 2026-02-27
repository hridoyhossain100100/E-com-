import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Settings from '@/models/Settings';

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ key: string }> }
) {
    try {
        const { verifyAdmin, unauthorizedResponse } = await import('@/lib/auth');
        const isAdmin = await verifyAdmin();
        if (!isAdmin) return unauthorizedResponse();

        await connectToDatabase();
        const { key } = await params;

        const body = await req.json();
        const { value } = body;

        if (value === undefined) {
            return NextResponse.json({ message: 'Value is required' }, { status: 400 });
        }

        const setting = await Settings.findOneAndUpdate(
            { key },
            { value },
            { upsert: true, new: true }
        );

        return NextResponse.json(setting);

    } catch (error: any) {
        return NextResponse.json(
            { message: 'Failed to update setting', error: error?.message },
            { status: 500 }
        );
    }
}
