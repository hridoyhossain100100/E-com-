import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Product from '@/models/Product';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

        // Upload new images to Cloudinary
        const newUrls: string[] = [];
        for (const file of images) {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const uploadResult = await new Promise<any>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'shopvibe_products' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(buffer);
            });

            if (uploadResult && uploadResult.secure_url) {
                newUrls.push(uploadResult.secure_url);
            } else {
                console.error("Cloudinary Upload Failed:", uploadResult);
                return NextResponse.json({ message: 'Failed to upload image to Cloudinary' }, { status: 500 });
            }
        }

        product.imageUrls.push(...newUrls);
        await product.save();

        return NextResponse.json(product);

    } catch (error: unknown) {
        console.error('Failed to add images:', error);
        return NextResponse.json(
            { message: 'Internal Server Error', error: (error instanceof Error ? error.message : String(error)) },
            { status: 500 }
        );
    }
}
