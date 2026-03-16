import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import MarketingScripts, { GTMNoScript } from "./components/MarketingScripts";
import LiveVisitorTrackerWrapper from "./components/LiveVisitorTrackerWrapper";
import connectToDatabase from "@/lib/mongodb";
import Settings from "@/models/Settings";

// @web-performance-optimization: Lazy load non-critical client components
const LiveVisitorTracker = LiveVisitorTrackerWrapper;

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

// Dynamic metadata from DB settings
async function getSettings() {
  try {
    await connectToDatabase();
    const allSettings = await Settings.find({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allSettings.forEach((s: any) => { result[s.key] = s.value; });
    return result;
  } catch {
    return {};
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const seo = settings.seo || {};
  const branding = settings.storeBranding || {};
  const storeName = branding.storeName || 'ShopVibe';
  const siteTitle = seo.siteTitle || `${storeName} — Premium E-Commerce Bangladesh`;
  const metaDesc = seo.metaDescription || "Your one-stop shop for quality products at the best prices in Bangladesh. Shop with confidence. Enjoy Cash on Delivery. Free delivery in Dhaka.";
  const keywords = seo.keywords ? seo.keywords.split(',').map((k: string) => k.trim()) : ["shop", "ecommerce", "online shopping", "bangladesh"];
  const siteUrl = seo.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://shopvibe.com";

  return {
    title: {
      default: siteTitle,
      template: `%s | ${storeName}`,
    },
    description: metaDesc,
    keywords,
    authors: [{ name: storeName }],
    creator: storeName,
    metadataBase: new URL(siteUrl),
    alternates: { canonical: "/" },
    openGraph: {
      title: siteTitle,
      description: metaDesc,
      type: "website",
      locale: "en_BD",
      siteName: storeName,
      ...(seo.ogImage ? { images: [{ url: seo.ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: metaDesc,
      ...(seo.ogImage ? { images: [seo.ogImage] } : {}),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

// @web-performance-optimization: Separate viewport export (Next.js best practice)
export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* @seo-fundamentals: Preconnect to external origins for faster loading */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const saved = localStorage.getItem('theme');
              if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            })()
          `
        }} />
        <MarketingScripts />
      </head>
      <body className={`${inter.className} antialiased min-h-screen bg-[var(--background)] text-[var(--foreground)]`} suppressHydrationWarning>
        <GTMNoScript />
        <LiveVisitorTracker />
        <Navbar initialSettings={await getSettings()} />
        <main>{children}</main>
      </body>
    </html>
  );
}
