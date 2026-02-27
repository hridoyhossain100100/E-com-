import { Metadata } from 'next';
import ProductDetailsClient, { Product } from './client';

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// --- DYNAMIC METADATA (Open Graph / SEO) ---
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    try {
        const res = await fetch(`${API}/api/products/${id}`, { cache: 'no-store' });
        if (!res.ok) return { title: 'Product Not Found - ShopVibe' };

        const product: Product = await res.json();

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

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let product: Product | null = null;
    let jsonLd = null;

    try {
        const res = await fetch(`${API}/api/products/${id}`, { cache: 'no-store' });
        if (res.ok) {
            product = await res.json();
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
        }
    } catch (e) {
        console.error("Failed to fetch product for server render", e);
    }

    return (
        <>
            {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
            <ProductDetailsClient initialProduct={product} productId={id} />
        </>
    );
}
