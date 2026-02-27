import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Settings from '@/models/Settings';

export const dynamic = 'force-dynamic';

const DEFAULTS: Record<string, any> = {
    shippingZones: [
        { id: 'dhaka', label: 'Inside Dhaka', cost: 60 },
        { id: 'outside', label: 'Outside Dhaka', cost: 120 },
        { id: 'remote', label: 'Remote Area', cost: 180 }
    ],
    categories: ['General'],
    banner: { text: '', enabled: false },
    storeName: 'ShopVibe',
    marquee: { text: 'Welcome to ShopVibe!', enabled: true, speed: 50, bgColor: '#ff0000' },
    marketing: { pixelId: '', gtmId: '', ga4Id: '' }
};

export async function GET() {
    try {
        await connectToDatabase();

        const allSettings = await Settings.find({});
        const result = { ...DEFAULTS };

        allSettings.forEach(s => {
            result[s.key] = s.value;
        });

        return NextResponse.json(result);

    } catch (error: any) {
        return NextResponse.json(
            { message: 'Failed to fetch settings', error: error?.message },
            { status: 500 }
        );
    }
}
