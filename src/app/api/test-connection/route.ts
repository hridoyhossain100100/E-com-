import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ 
        success: true, 
        message: 'Backend is reachable',
        time: new Date().toISOString()
    });
}
