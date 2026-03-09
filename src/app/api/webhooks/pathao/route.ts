import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import crypto from 'crypto';

// This is the secret you set in your Pathao Merchant Dashboard for Webhooks
const PATHAO_WEBHOOK_SECRET = process.env.PATHAO_WEBHOOK_SECRET || '';

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const payload = JSON.parse(rawBody);
        console.log('[Pathao Webhook] Received event:', payload.event);

        // ─── 1. Verification Handshake ─────────────────────────────────────────
        if (payload.event === 'webhook_integration') {
            console.log('[Pathao Webhook] Handshake verified.');
            return new NextResponse(null, {
                status: 202,
                headers: {
                    'X-Pathao-Merchant-Webhook-Integration-Secret': PATHAO_WEBHOOK_SECRET,
                },
            });
        }

        // ─── 2. Security Validation (HMAC) ─────────────────────────────────────
        const signature = req.headers.get('x-pathao-signature');
        if (!signature) {
            console.warn('[Pathao Webhook] Missing X-PATHAO-Signature header');
            return NextResponse.json({ message: 'Missing Signature' }, { status: 401 });
        }

        const calculatedSignature = crypto
            .createHmac('sha256', PATHAO_WEBHOOK_SECRET)
            .update(rawBody)
            .digest('hex');

        if (signature !== calculatedSignature && signature !== PATHAO_WEBHOOK_SECRET) {
            console.warn('[Pathao Webhook] Invalid Signature mismatch');
            return NextResponse.json({ message: 'Invalid Signature' }, { status: 401 });
        }

        // ─── 3. Order Status Updates ───────────────────────────────────────────
        if (payload.event && payload.consignment_id) {
            await connectToDatabase();

            const order = await Order.findOne({ consignmentId: payload.consignment_id });

            if (!order) {
                console.warn(`[Pathao Webhook] Order with consignment ID ${payload.consignment_id} not found.`);
                return NextResponse.json({ message: 'Order not found, but acknowledged' }, { status: 200 });
            }

            const eventName = payload.event.toLowerCase();
            let newStatus = order.status;
            let newPathaoStatus = order.pathaoStatus || 'Pickup_Pending';

            // Map Pathao events to internal status + granular pathaoStatus
            if (eventName === 'order.delivered' || eventName === 'order.partial-delivery') {
                newStatus = 'delivered';
                newPathaoStatus = 'Delivered';
            }
            else if (eventName === 'order.assigned-for-delivery') {
                newStatus = 'shipped';
                newPathaoStatus = 'Out_For_Delivery';
            }
            else if (eventName === 'order.in-transit' || eventName === 'order.at-sorting-hub') {
                newStatus = 'shipped';
                newPathaoStatus = 'In_Transit';
            }
            else if (eventName === 'order.picked') {
                newStatus = 'shipped';
                newPathaoStatus = 'Picked';
            }
            else if (eventName === 'order.return' || eventName === 'order.delivery-failed') {
                newPathaoStatus = 'Return';
                console.log(`[Pathao Webhook] Order ${order.orderNumber} failed/returned. Needs manual review.`);
            }

            if (newStatus !== order.status || newPathaoStatus !== order.pathaoStatus) {
                order.status = newStatus;
                order.pathaoStatus = newPathaoStatus;
                await order.save();
                console.log(`[Pathao Webhook] Order ${order.orderNumber} → status: ${newStatus}, pathaoStatus: ${newPathaoStatus}`);
            }

            return NextResponse.json({ message: 'Success' }, { status: 200 });
        }

        // ─── 4. Unhandled Events ───────────────────────────────────────────────
        return NextResponse.json({ message: 'Event ignored' }, { status: 200 });

    } catch (error: any) {
        console.error('[Pathao Webhook] Terminal Error:', error.message);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
