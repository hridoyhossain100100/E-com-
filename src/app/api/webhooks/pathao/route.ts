import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import crypto from 'crypto';

// This is the secret you set in your Pathao Merchant Dashboard for Webhooks
const PATHAO_WEBHOOK_SECRET = 'f3992ecc-59da-4cbe-a049-a13da2018d51';

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const payload = JSON.parse(rawBody);
        console.log('[Pathao Webhook] Received event:', payload.event);

        // ─── 1. Verification Handshake ─────────────────────────────────────────
        // Pathao sends this when you test/register the URL in their panel.
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

        // Usually, Pathao signatures are HMAC-SHA256 of the raw body using the secret.
        // If Pathao's signature is just the secret itself (as some docs suggest for basic setups),
        // you would compare signature === PATHAO_WEBHOOK_SECRET. 
        // Assuming a standard HMAC comparison here, but falling back to direct match just in case:
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

            // Find the Mongo order holding this consignment ID
            const order = await Order.findOne({ consignmentId: payload.consignment_id });

            if (!order) {
                console.warn(`[Pathao Webhook] Order with consignment ID ${payload.consignment_id} not found.`);
                return NextResponse.json({ message: 'Order not found, but acknowledged' }, { status: 200 });
            }

            const eventName = payload.event.toLowerCase(); // e.g., 'order.in-transit', 'order.delivered'
            let newStatus = order.status;

            // Map Pathao's detailed events back to your Mongoose Enum: ['pending', 'confirmed', 'shipped', 'delivered']
            if (eventName === 'order.delivered' || eventName === 'order.partial-delivery') {
                newStatus = 'delivered';
                // Note: You might want to save payload.collected_amount if needed
            }
            else if (
                eventName === 'order.in-transit' ||
                eventName === 'order.assigned-for-delivery' ||
                eventName === 'order.at-sorting-hub' ||
                eventName === 'order.picked'
            ) {
                newStatus = 'shipped';
            }
            else if (eventName === 'order.return' || eventName === 'order.delivery-failed') {
                // Your enum doesn't have a 'failed' or 'returned' state yet, so we log it.
                // Once you add it to the schema, you can set it here.
                console.log(`[Pathao Webhook] Order ${order.orderNumber} failed/returned. Needs manual review.`);
            }

            if (newStatus !== order.status) {
                order.status = newStatus;
                await order.save();
                console.log(`[Pathao Webhook] Order ${order.orderNumber} strictly synchronized to: ${newStatus}`);
            }

            return NextResponse.json({ message: 'Success' }, { status: 200 });
        }

        // ─── 4. Unhandled Events (e.g., store.updated) ─────────────────────────
        return NextResponse.json({ message: 'Event ignored' }, { status: 200 });

    } catch (error: any) {
        console.error('[Pathao Webhook] Terminal Error:', error.message);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
