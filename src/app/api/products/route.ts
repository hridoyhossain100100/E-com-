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

export async function GET(req: Request) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '0');
        const limit = parseInt(searchParams.get('limit') || '0');
        const category = searchParams.get('category');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query: Record<string, any> = {};
        if (category && category !== 'All') {
            query.category = category;
        }

        // If pagination params provided, use pagination; otherwise return all (backward compatible)
        if (page > 0 && limit > 0) {
            const skip = (page - 1) * limit;
            const [products, total] = await Promise.all([
                Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
                Product.countDocuments(query)
            ]);
            return NextResponse.json({
                products,
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            });
        }

        // Default: return all products (backward compatible for homepage)
        const products = await Product.find(query).sort({ createdAt: -1 });
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

        // Configure Cloudinary inside handler to avoid module-load caching
        cloudinary.config({
            cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
            api_key: (process.env.CLOUDINARY_API_KEY || '').trim(),
            api_secret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
        });

        const formData = await req.formData();

        const name = formData.get('name') as string;
        const price = formData.get('price') as string;
        const description = formData.get('description') as string;
        const category = formData.get('category') as string;
        const stock = formData.get('stock') as string;
        const variants = formData.get('variants') as string;
        const descriptionSections = formData.get('descriptionSections') as string;
        const videoUrl = formData.get('videoUrl') as string;
        const attributes = formData.get('attributes') as string;
        const tags = formData.get('tags') as string;
        const sku = formData.get('sku') as string;

        // @security-audit [xss-html-injection]: Input validation & sanitization
        if (!name || name.trim().length < 2 || name.length > 200) {
            return NextResponse.json({ message: 'Product name must be 2-200 characters' }, { status: 400 });
        }
        if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0 || parseFloat(price) > 10000000) {
            return NextResponse.json({ message: 'Invalid price (0 - 10,000,000)' }, { status: 400 });
        }
        if (!description || description.trim().length < 5 || description.length > 5000) {
            return NextResponse.json({ message: 'Description must be 5-5000 characters' }, { status: 400 });
        }
        if (category && category.length > 100) {
            return NextResponse.json({ message: 'Category name too long' }, { status: 400 });
        }
        if (stock && (isNaN(parseInt(stock)) || parseInt(stock) < 0 || parseInt(stock) > 1000000)) {
            return NextResponse.json({ message: 'Invalid stock value' }, { status: 400 });
        }

        const images = formData.getAll('images') as File[];

        if (!images || images.length === 0) {
            return NextResponse.json({ message: 'At least one image is required' }, { status: 400 });
        }

        // @security-audit [file-uploads]: Validate file types and sizes
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        const MAX_FILES = 10;

        if (images.length > MAX_FILES) {
            return NextResponse.json({ message: `Maximum ${MAX_FILES} images allowed` }, { status: 400 });
        }

        for (const file of images) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                return NextResponse.json({ message: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, AVIF` }, { status: 400 });
            }
            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json({ message: `File too large: ${file.name}. Max 5MB per image` }, { status: 400 });
            }
        }

        // Upload images to Cloudinary
        const imageUrls: string[] = [];
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
            descriptionSections: descriptionSections ? JSON.parse(descriptionSections) : [],
            imageUrls,
            videoUrl: videoUrl || "",
            category: category || 'General',
            stock: parseInt(stock) || 0,
            variants: variants ? JSON.parse(variants) : [],
            attributes: attributes ? JSON.parse(attributes) : [],
            tags: tags ? JSON.parse(tags) : [],
            sku: sku || '',
        });

        const savedProduct = await product.save();
        return NextResponse.json(savedProduct, { status: 201 });

    } catch (error: unknown) {
        console.error('Failed to create product:', error);
        // @security-audit [sensitive-data-exposure]: Don't leak internal error details in production
        return NextResponse.json(
            { message: 'Failed to create product' },
            { status: 500 }
        );
    }
}
