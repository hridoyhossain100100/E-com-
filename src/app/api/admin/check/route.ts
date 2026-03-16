import { NextResponse } from 'next/server';
import { verifyAdmin, unauthorizedResponse } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';

export async function GET() {
    const isAdmin = await verifyAdmin();

    if (!isAdmin) {
        return unauthorizedResponse();
    }

    try {
        // Quick DB connection check to wake up the serverless function
        await connectToDatabase();
        return NextResponse.json({ isAuthenticated: true });
    } catch {
        return NextResponse.json({ message: 'Database connection failed' }, { status: 500 });
    }
}
