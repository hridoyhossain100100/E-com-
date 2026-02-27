import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Product from '@/models/Product';
import mongoose from 'mongoose';

export async function POST(
    req: Request,
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

        const product = await Product.findById(id);
        if (!product) {
            return NextResponse.json({ message: 'Product not found' }, { status: 404 });
        }

        const formData = await req.formData();
        const images = formData.getAll('images') as File[];

        if (!images || images.length === 0) {
            return NextResponse.json({ message: 'No images provided' }, { status: 400 });
        }

        const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
        if (!IMGBB_API_KEY) {
            return NextResponse.json({ message: 'ImgBB API key is missing' }, { status: 500 });
        }

        // Upload new images to ImgBB
        const newUrls: string[] = [];
        for (const file of images) {
            const buffer = await file.arrayBuffer();
            const base64Image = Buffer.from(buffer).toString('base64');

            const imgbbFormData = new FormData();
            imgbbFormData.append('key', IMGBB_API_KEY);
            imgbbFormData.append('image', base64Image);

            const res = await fetch('https://api.imgbb.com/1/upload', {
                method: 'POST',
                body: imgbbFormData
            });
            const data = await res.json();

            if (data && data.data && data.data.display_url) {
                newUrls.push(data.data.display_url);
            } else {
                return NextResponse.json({ message: 'Failed to upload image' }, { status: 500 });
            }
        }

        product.imageUrls.push(...newUrls);
        await product.save();

        return NextResponse.json(product);

    } catch (error: any) {
        console.error('Failed to add images:', error);
        return NextResponse.json(
            { message: 'Internal Server Error', error: error?.message },
            { status: 500 }
        );
    }
}
