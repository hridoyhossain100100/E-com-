import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Product from '@/models/Product';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await connectToDatabase();

        // Fetch products, sorted by newest first
        const products = await Product.find().sort({ createdAt: -1 });

        return NextResponse.json(products);
    } catch (error) {
        console.error('Failed to fetch products:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const { verifyAdmin, unauthorizedResponse } = await import('@/lib/auth');
        const isAdmin = await verifyAdmin();
        if (!isAdmin) return unauthorizedResponse();

        await connectToDatabase();
        const formData = await req.formData();

        const name = formData.get('name') as string;
        const price = formData.get('price') as string;
        const description = formData.get('description') as string;
        const category = formData.get('category') as string;
        const stock = formData.get('stock') as string;
        const variants = formData.get('variants') as string;

        const images = formData.getAll('images') as File[];

        if (!images || images.length === 0) {
            return NextResponse.json({ message: 'At least one image is required' }, { status: 400 });
        }

        // Upload images to Cloudinary
        const imageUrls: string[] = [];
        for (const file of images) {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

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
                imageUrls.push(uploadResult.secure_url);
            } else {
                console.error("Cloudinary Upload Failed:", uploadResult);
                return NextResponse.json({ message: 'Failed to upload image to Cloudinary' }, { status: 500 });
            }
        }

        const product = new Product({
            name,
            price: parseFloat(price),
            description,
            imageUrls,
            category: category || 'General',
            stock: parseInt(stock) || 0,
            variants: variants ? JSON.parse(variants) : []
        });

        const savedProduct = await product.save();
        return NextResponse.json(savedProduct, { status: 201 });

    } catch (error: any) {
        console.error('Failed to create product:', error);
        return NextResponse.json(
            { message: 'Internal Server Error', error: error?.message },
            { status: 500 }
        );
    }
}
