import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';

export async function GET(req: Request) {
    try {
        const { verifyAdmin, unauthorizedResponse } = await import('@/lib/auth');
        const isAdmin = await verifyAdmin();
        if (!isAdmin) return unauthorizedResponse();

        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const statusMode = searchParams.get('status');

        let query: any = {};
        if (statusMode && statusMode !== 'all') {
            query.status = statusMode;
        }

        const orders = await Order.find(query).sort({ createdAt: -1 });

        let csvData = 'Order ID,Date,Customer Name,Phone,Address,Items,Total,Status,Payment\n';
        orders.forEach((o: any) => {
            const date = o.createdAt.toISOString().split('T')[0];
            const name = `"${parseFloat(o.customerName) ? '_' : ''}${o.customerName.replace(/"/g, '""')}"`;
            const phone = `"${o.customerPhone}"`;
            const addr = `"${o.customerAddress.replace(/"/g, '""')}"`;
            const items = `"${o.products.map((p: any) => `${p.quantity}x ${p.name}`).join(' | ').replace(/"/g, '""')}"`;
            csvData += `${o.orderNumber},${date},${name},${phone},${addr},${items},${o.totalAmount},${o.status},${o.paymentMethod}\n`;
        });

        return new NextResponse(csvData, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename=orders-export.csv'
            }
        });

    } catch (error: any) {
        return NextResponse.json(
            { message: 'Failed to export CSV', error: error?.message },
            { status: 500 }
        );
    }
}
