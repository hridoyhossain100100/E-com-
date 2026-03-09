'use server';

import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import { revalidatePath } from 'next/cache';

// ─── Pathao Environment Variables ───────────────────────────────────────────
const PATHAO_BASE_URL = process.env.PATHAO_BASE_URL;
const PATHAO_CLIENT_ID = process.env.PATHAO_CLIENT_ID;
const PATHAO_CLIENT_SECRET = process.env.PATHAO_CLIENT_SECRET;
const PATHAO_USERNAME = process.env.PATHAO_USERNAME;
const PATHAO_PASSWORD = process.env.PATHAO_PASSWORD;
const PATHAO_STORE_ID = process.env.PATHAO_STORE_ID;

// ─── Types ──────────────────────────────────────────────────────────────────
interface PathaoTokenResponse {
    token_type: string;
    expires_in: number;
    access_token: string;
    refresh_token: string;
}

interface PathaoOrderResponse {
    message: string;
    type: string;
    code: number;
    data: {
        consignment_id: string;
        merchant_order_id: string;
        order_status: string;
        delivery_fee: number;
    };
}

export interface DeliveryDetails {
    itemWeight: number;
    deliveryType: number;     // 48 = Normal, 12 = On-Demand
    specialInstruction: string;
    itemDescription: string;
    amountToCollect: number;
    itemQuantity: number;
}

interface ActionResult {
    success: boolean;
    consignmentId?: string;
    deliveryFee?: number;
    error?: string;
}

// ─── Helper: Get Access Token ───────────────────────────────────────────────
async function getPathaoAccessToken(): Promise<string> {
    const payload = {
        client_id: PATHAO_CLIENT_ID,
        client_secret: PATHAO_CLIENT_SECRET,
        username: PATHAO_USERNAME,
        password: PATHAO_PASSWORD,
        grant_type: 'password',
    };

    const response = await fetch(`${PATHAO_BASE_URL}/aladdin/api/v1/issue-token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('[Pathao Auth Error]', response.status, errorBody);
        throw new Error(`Pathao authentication failed (${response.status})`);
    }

    const data: PathaoTokenResponse = await response.json();
    return data.access_token;
}

// ─── Main Server Action ────────────────────────────────────────────────────
export async function sendOrderToPathao(orderId: string, deliveryDetails: DeliveryDetails): Promise<ActionResult> {
    try {
        // Validate env vars
        if (!PATHAO_BASE_URL || !PATHAO_CLIENT_ID || !PATHAO_CLIENT_SECRET || !PATHAO_USERNAME || !PATHAO_PASSWORD || !PATHAO_STORE_ID) {
            throw new Error('Missing Pathao environment variables. Check your .env.local file.');
        }

        await connectToDatabase();

        // ── Step 1: Fetch Order from MongoDB ──────────────────────────────────
        const order = await Order.findById(orderId);
        if (!order) {
            throw new Error(`Order with ID "${orderId}" not found in the database.`);
        }

        if (order.status === 'shipped' || order.status === 'delivered') {
            throw new Error(`Order #${order.orderNumber} has already been ${order.status}.`);
        }

        // ── Step 2: Authenticate with Pathao ──────────────────────────────────
        const accessToken = await getPathaoAccessToken();

        // ── Step 3: Build Pathao Order Payload using user-provided values ─────
        // Ensure recipient_address is at least 10 characters long (Pathao requirement)
        let safeAddress = order.customerAddress || "No Address Provided";
        if (safeAddress.length < 10) safeAddress = safeAddress + "          ";

        const pathaoPayload = {
            store_id: parseInt(PATHAO_STORE_ID, 10),
            merchant_order_id: order.orderNumber.toString(),
            recipient_name: order.customerName || "Customer",
            recipient_phone: order.customerPhone || "01700000000",
            recipient_address: safeAddress,
            delivery_type: deliveryDetails.deliveryType || 48,
            item_type: 2,         // 2 = Parcel
            special_instruction: deliveryDetails.specialInstruction || "None",
            item_quantity: deliveryDetails.itemQuantity || 1,
            item_weight: deliveryDetails.itemWeight || 0.5,
            item_description: deliveryDetails.itemDescription || "Item",
            amount_to_collect: deliveryDetails.amountToCollect || order.totalAmount,
        };

        // ── Step 4: Create Order in Pathao ────────────────────────────────────
        const orderResponse = await fetch(`${PATHAO_BASE_URL}/aladdin/api/v1/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(pathaoPayload),
        });

        if (!orderResponse.ok) {
            const errorBody = await orderResponse.text();
            console.error('[Pathao Order Error]', orderResponse.status, errorBody);
            throw new Error(`Pathao order creation failed (${orderResponse.status}): ${errorBody}`);
        }

        const orderData: PathaoOrderResponse = await orderResponse.json();
        const consignmentId = orderData.data?.consignment_id;

        if (!consignmentId) {
            throw new Error('Pathao responded successfully but consignment_id is missing.');
        }

        // ── Step 5: Update MongoDB Order ──────────────────────────────────────
        order.consignmentId = consignmentId;
        order.status = 'confirmed';
        order.pathaoStatus = 'Pickup_Pending';

        // Save the exact shipping cost calculated by Pathao inside the order
        if (orderData.data?.delivery_fee) {
            order.shippingCost = orderData.data.delivery_fee;
        }

        await order.save();

        revalidatePath('/admin/oms');

        return {
            success: true,
            consignmentId,
            deliveryFee: orderData.data?.delivery_fee,
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error('[sendOrderToPathao]', message);
        return { success: false, error: message };
    }
}
