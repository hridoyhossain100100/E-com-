import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Settings from '@/models/Settings';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const { token } = await req.json();

        if (!token) {
            return NextResponse.json({ success: false, message: 'Token is required' }, { status: 400 });
        }

        // Store or update the FCM token in settings
        console.log('Received FCM token to save:', token);
        await Settings.findOneAndUpdate(
            { key: 'FCM_ADMIN_TOKEN' },
            { value: token },
            { upsert: true, new: true }
        );

        return NextResponse.json({ success: true, message: 'FCM token saved successfully' });
    } catch (error: unknown) {
        console.error('Error saving FCM token:', error);
        return NextResponse.json({ success: false, message: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
    }
}
