import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Settings from '@/models/Settings';

export const dynamic = 'force-dynamic';

const DEFAULTS: Record<string, any> = {
    shippingZones: [
        { id: 'dhaka', label: 'Inside Dhaka', cost: 60 },
        { id: 'outside', label: 'Outside Dhaka', cost: 120 },
        { id: 'remote', label: 'Remote Area', cost: 180 }
    ],
    categories: ['General'],
    banner: { text: '', enabled: false },
    storeName: 'ShopVibe',
    marquee: { text: 'Welcome to ShopVibe!', enabled: true, speed: 50, bgColor: '#ff0000' },
    marketing: { pixelId: '', gtmId: '', ga4Id: '' },
    // Store Branding
    storeBranding: {
        storeName: 'ShopVibe',
        storeTagline: 'Premium E-Commerce Bangladesh',
        logoUrl: '',
        faviconUrl: '',
        storeInitial: 'S',
    },
    // Contact Info
    contactInfo: {
        phone: '+880 1XXXXXXXXX',
        email: 'support@shopvibe.com',
        address: '123 Commerce Avenue, Dhaka, Bangladesh',
    },
    // Social Media Links
    socialLinks: {
        facebook: '',
        instagram: '',
        whatsapp: '',
        youtube: '',
    },
    // Hero Section
    heroContent: {
        badge: 'Premium Collection',
        title: 'Discover Quality',
        titleHighlight: 'Products',
        description: 'Curated collection of premium products. Shop with confidence, pay with Bkash, Nagad or Rocket.',
        showNewArrivals: true,
    },
    // Footer Content
    footerContent: {
        description: 'Your trusted destination for premium products in Bangladesh. Quality guaranteed.',
        copyrightText: '© {year} ShopVibe. All rights reserved. Made with 💜 in Bangladesh',
        paymentMethods: ['Bkash', 'Nagad', 'Rocket'],
        quickLinks: [
            { label: 'Shop', href: '/' },
            { label: 'Checkout', href: '/checkout' },
            { label: 'Wishlist', href: '/wishlist' },
        ],
    },
    // SEO Settings
    seo: {
        siteTitle: 'ShopVibe — Premium E-Commerce Bangladesh',
        metaDescription: 'Your one-stop shop for quality products at the best prices in Bangladesh. Shop with confidence, pay with Bkash, Nagad or Rocket. Free delivery in Dhaka.',
        keywords: 'shop, ecommerce, bkash, online shopping, bangladesh, nagad, rocket, premium products, dhaka, shopvibe',
        ogImage: '',
        siteUrl: '',
    },
    // Appearance
    appearance: {
        productsPerRow: 4,
        defaultTheme: 'dark',
    },
};

export async function GET() {
    try {
        await connectToDatabase();

        const allSettings = await Settings.find({});
        const result = { ...DEFAULTS };

        allSettings.forEach(s => {
            result[s.key] = s.value;
        });

        return NextResponse.json(result);

    } catch (error: any) {
        return NextResponse.json(
            { message: 'Failed to fetch settings', error: error?.message },
            { status: 500 }
        );
    }
}
