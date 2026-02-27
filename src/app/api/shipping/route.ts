import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Settings from '@/models/Settings';

export async function GET() {
    try {
        await connectToDatabase();
        const setting = await Settings.findOne({ key: 'shippingZones' });
        const dzSetting = await Settings.findOne({ key: 'showDeliveryZone' });

        let zones = [
            { id: 'dhaka', label: 'ঢাকার ভেতরে', cost: 60 },
            { id: 'outside', label: 'ঢাকার বাইরে', cost: 120 }
        ];

        if (setting && setting.value && Array.isArray(setting.value)) {
            zones = setting.value;
        }

        const showDeliveryZone = dzSetting ? dzSetting.value : true;

        return NextResponse.json({ zones, showDeliveryZone });
    } catch (error: any) {
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
