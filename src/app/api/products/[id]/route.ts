import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Product from '@/models/Product';
import mongoose from 'mongoose';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();

        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid product ID' }, { status: 400 });
        }

        const product = await Product.findById(id);

        if (!product) {
            return NextResponse.json({ message: 'Product not found' }, { status: 404 });
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error('Failed to fetch product:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { verifyAdmin, unauthorizedResponse } = await import('@/lib/auth');
        const isAdmin = await verifyAdmin();
        if (!isAdmin) return unauthorizedResponse();

        await connectToDatabase();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid product ID' }, { status: 400 });
        }

        const body = await request.json();
        const { name, price, description, descriptionSections, category, stock, variants, imageUrls, videoUrl } = body;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: Record<string, any> = {};
        if (name !== undefined) updateData.name = name;
        if (price !== undefined) updateData.price = parseFloat(price);
        if (description !== undefined) updateData.description = description;
        if (descriptionSections !== undefined) updateData.descriptionSections = descriptionSections;
        if (category !== undefined) updateData.category = category;
        if (stock !== undefined) updateData.stock = parseInt(stock);
        if (variants !== undefined) updateData.variants = typeof variants === 'string' ? JSON.parse(variants) : variants;
        if (imageUrls !== undefined) updateData.imageUrls = imageUrls;
        if (videoUrl !== undefined) updateData.videoUrl = videoUrl;

        const product = await Product.findByIdAndUpdate(id, updateData, { new: true });

        if (!product) {
            return NextResponse.json({ message: 'Product not found' }, { status: 404 });
        }

        return NextResponse.json(product);
    } catch (error: unknown) {
        console.error('Failed to update product:', error);
        // @security-audit [sensitive-data-exposure]: Don't leak internal error details
        return NextResponse.json(
            { message: 'Failed to update product' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { verifyAdmin, unauthorizedResponse } = await import('@/lib/auth');
        const isAdmin = await verifyAdmin();
        if (!isAdmin) return unauthorizedResponse();

        await connectToDatabase();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid product ID' }, { status: 400 });
        }

        const product = await Product.findByIdAndDelete(id);

        if (!product) {
            return NextResponse.json({ message: 'Product not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Product deleted' });
    } catch (error: unknown) {
        return NextResponse.json(
            { message: 'Failed to delete product', error: (error instanceof Error ? error.message : String(error)) },
            { status: 500 }
        );
    }
}
