import { NextResponse } from 'next/server';
import { sendOrderToPathao } from '@/app/actions/pathaoIntegration';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { verifyAdmin, unauthorizedResponse } = await import('@/lib/auth');
        const isAdmin = await verifyAdmin();
        if (!isAdmin) return unauthorizedResponse();

        const { id } = await params;
        const body = await req.json();

        // deliveryDetails from mobile app body
        const result = await sendOrderToPathao(id, body);

        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json(result, { status: 400 });
        }

    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to send to Pathao' },
            { status: 500 }
        );
    }
}
