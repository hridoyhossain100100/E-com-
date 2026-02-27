import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Visitor from '@/models/Visitor';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export async function POST(req: Request) {
    try {
        const { sessionId } = await req.json();

        if (!sessionId) {
            return NextResponse.json({ message: 'Session ID is required' }, { status: 400 });
        }

        await connectToDatabase();

        // Upsert the visitor record
        await Visitor.findOneAndUpdate(
            { sessionId },
            { lastSeen: new Date() },
            { upsert: true, returnDocument: 'after' }
        );

        return NextResponse.json(
            { success: true },
            {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }
            }
        );
    } catch (error) {
        console.error('Visitor ping error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return NextResponse.json(
        {},
        {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        }
    );
}
