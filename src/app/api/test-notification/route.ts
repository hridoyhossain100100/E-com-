import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/pushNotification';
import connectToDatabase from '@/lib/mongodb';
import Settings from '@/models/Settings';

export async function GET() {
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
        
        // Character-by-character analysis of the start
        const rawPrefix = privateKeyRaw ? privateKeyRaw.substring(0, 100) : '';
        const rawHex = Array.from(rawPrefix).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');

        const debugInfo = {
            env: {
                projectId: projectId ? `${projectId.substring(0, 5)}...` : 'missing',
                clientEmail: clientEmail ? `${clientEmail.substring(0, 10)}...` : 'missing',
                privateKeyLength: privateKeyRaw?.length,
                privateKeyPrefix: rawPrefix,
                privateKeyRawHex: rawHex,
                hasNewlineLiteral: privateKeyRaw?.includes('\\n'),
                hasActualNewline: privateKeyRaw?.includes('\n'),
                hasCarriageReturn: privateKeyRaw?.includes('\r'),
            }
        };

        console.log('Test Notification Diagnostics:', JSON.stringify(debugInfo, null, 2));
        
        await connectToDatabase();
        const adminTokenSetting = await Settings.findOne({ key: 'FCM_ADMIN_TOKEN' });
        const adminToken = adminTokenSetting?.value;

        const response = await sendPushNotification(
            'Test Notification',
            'Verification at ' + new Date().toLocaleTimeString(),
            { type: 'test' },
            adminToken
        );
        
        return NextResponse.json({ 
            success: true, 
            message: 'Notification sent', 
            response, 
            debugInfo 
        });
    } catch (error: any) {
        console.error('Test Notification Error:', error);
        
        const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
        const rawPrefix = privateKeyRaw ? privateKeyRaw.substring(0, 100) : '';
        const rawHex = Array.from(rawPrefix).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');

        return NextResponse.json({ 
            success: false, 
            message: error.message, 
            code: error.code,
            debug: {
                privateKeyLength: privateKeyRaw?.length,
                privateKeyPrefix: rawPrefix,
                privateKeyRawHex: rawHex,
                hasNewlineLiteral: privateKeyRaw?.includes('\\n'),
                hasActualNewline: privateKeyRaw?.includes('\n'),
            },
            stack: error.stack 
        }, { status: 500 });
    }
}
