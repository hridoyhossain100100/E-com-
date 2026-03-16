import { NextResponse } from 'next/server';
import axios from 'axios';

const PATHAO_BASE_URL = process.env.PATHAO_BASE_URL;
const PATHAO_CLIENT_ID = process.env.PATHAO_CLIENT_ID;
const PATHAO_CLIENT_SECRET = process.env.PATHAO_CLIENT_SECRET;
const PATHAO_USERNAME = process.env.PATHAO_USERNAME;
const PATHAO_PASSWORD = process.env.PATHAO_PASSWORD;
const PATHAO_GRANT_TYPE = process.env.PATHAO_GRANT_TYPE;

let accessToken: string | null = null;
let tokenExpiryTime: number | null = null;

// Function to get or refresh Pathao access token
async function getAccessToken() {
    // If token exists and is valid (with 5 minute buffer), use it
    if (accessToken && tokenExpiryTime && Date.now() < tokenExpiryTime - 300000) {
        return accessToken;
    }

    try {
        const response = await axios.post(`${PATHAO_BASE_URL}/aladdin/api/v1/issue-token`, {
            client_id: PATHAO_CLIENT_ID,
            client_secret: PATHAO_CLIENT_SECRET,
            username: PATHAO_USERNAME,
            password: PATHAO_PASSWORD,
            grant_type: PATHAO_GRANT_TYPE
        });

        if (response.data && response.data.access_token) {
            accessToken = response.data.access_token;
            // Token usually expires in 30 days (2592000 seconds), storing expiry time
            tokenExpiryTime = Date.now() + (response.data.expires_in * 1000);
            return accessToken;
        } else {
            throw new Error('Failed to retrieve access token from Pathao API');
        }
    } catch (error: unknown) {
        const err = error as { response?: { data?: unknown }; message?: string };
        console.error('Pathao Token Error:', err.response?.data || err.message);
        throw new Error('Authentication with Pathao failed');
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const consignmentId = searchParams.get('consignment_id');

    if (!consignmentId) {
        return NextResponse.json({ success: false, message: 'Consignment ID is required.' }, { status: 400 });
    }

    try {
        const token = await getAccessToken();

        const response = await axios.get(`${PATHAO_BASE_URL}/aladdin/api/v1/orders/${consignmentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.data) {
             return NextResponse.json({ success: true, data: response.data.data });
        } else {
             return NextResponse.json({ success: false, message: 'Invalid response from Pathao API' }, { status: 502 });
        }
    } catch (error: unknown) {
         const err = error as { response?: { status?: number; data?: { message?: string } }; message?: string };
         console.error('Pathao Tracking API Error:', err.response?.data || err.message);
         // Return 404 if Pathao API specifically says not found, else 500
         const status = err.response?.status === 404 ? 404 : 500;
         const message = err.response?.data?.message || 'Failed to track order with Pathao';
         
         return NextResponse.json({ success: false, message, details: err.response?.data }, { status });
    }
}
