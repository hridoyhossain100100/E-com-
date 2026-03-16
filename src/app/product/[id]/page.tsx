/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Metadata } from 'next';
import ProductDetailsClient, { Product } from './client';
import connectToDatabase from '@/lib/mongodb';
import ProductModel from '@/models/Product';
import mongoose from 'mongoose';

// Helper: fetch product directly from DB (server component — no HTTP round-trip)
async function getProductFromDB(id: string): Promise<Product | null> {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) return null;
        await connectToDatabase();
        const doc = await ProductModel.findById(id).lean();
        if (!doc) return null;
        return JSON.parse(JSON.stringify(doc)) as Product;
    } catch {
        return null;
    }
}

// --- DYNAMIC METADATA (Open Graph / SEO) ---
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    try {
        const product = await getProductFromDB(id);
        if (!product) return { title: 'Product Not Found - ShopVibe' };

        return {
            title: `${product.name} — ShopVibe`,
            description: product.description.slice(0, 160),
            openGraph: {
                title: product.name,
                description: product.description.slice(0, 160),
                url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://shopvibe.com'}/product/${product._id}`,
                siteName: 'ShopVibe',
                images: product.imageUrls.length > 0 ? [
                    {
                        url: product.imageUrls[0],
                        width: 800,
                        height: 600,
                        alt: product.name,
                    }
                ] : [],
                locale: 'en_US',
                type: 'website',
            },
        };
    } catch (e) {
        return { title: 'ShopVibe' };
    }
}

import Settings from '@/models/Settings';

// Helper: fetch settings directly from DB
async function getSettingsFromDB() {
    try {
        await connectToDatabase();
        const allSettings = await Settings.find({});
        const result: Record<string, any> = {};
        allSettings.forEach((s: any) => { result[s.key] = s.value; });
        return result;
    } catch {
        return {};
    }
}

// Helper: fetch shipping directly from DB
async function getShippingFromDB() {
    try {
        await connectToDatabase();
        const setting = await Settings.findOne({ key: 'shippingZones' });
        const dzSetting = await Settings.findOne({ key: 'showDeliveryZone' });

        let zones = [
            { id: 'dhaka', label: 'ঢাকার ভেতরে', cost: 60 },
            { id: 'outside', label: 'ঢাকার বাইরে', cost: 120 }
        ];

        if (setting && setting.value && Array.isArray(setting.value)) {
            zones = setting.value;
        }

        const showDeliveryZone = dzSetting ? dzSetting.value : true;

        return { zones, showDeliveryZone };
    } catch {
        return { zones: [], showDeliveryZone: true };
    }
}

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let product: Product | null = null;
    let settings: any = {};
    let shipping: any = { zones: [{ id: "dhaka", label: "ঢাকার ভেতরে", cost: 60 }, { id: "outside", label: "ঢাকার বাইরে", cost: 120 }], showDeliveryZone: true };
    let jsonLd = null;

    try {
        const [prod, sets, ships] = await Promise.all([
            getProductFromDB(id),
            getSettingsFromDB(),
            getShippingFromDB()
        ]);
        product = prod;
        settings = sets;
        shipping = ships;

        if (product) {
            jsonLd = {
                '@context': 'https://schema.org',
                '@type': 'Product',
                name: product.name,
                image: product.imageUrls,
                description: product.description,
                sku: product._id,
                offers: {
                    '@type': 'Offer',
                    url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/product/${product._id}`,
                    priceCurrency: 'BDT',
                    price: product.price,
                    availability: (product.stock || 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                    itemCondition: 'https://schema.org/NewCondition'
                }
            };
        }
    } catch (e) {
        console.error("Failed to fetch product for server render", e);
    }

    return (
        <>
            {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
            <ProductDetailsClient
                initialProduct={product}
                productId={id}
                initialSettings={settings}
                initialShipping={shipping}
            />
        </>
    );
}
