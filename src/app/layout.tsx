import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import MarketingScripts, { GTMNoScript } from "./components/MarketingScripts";
import LiveVisitorTracker from "./components/LiveVisitorTracker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ShopVibe — Premium E-Commerce",
  description: "Your one-stop shop for quality products at the best prices. Shop with confidence, pay with Bkash, Nagad or Rocket.",
  keywords: "shop, ecommerce, bkash, online shopping, bangladesh",
  openGraph: {
    title: "ShopVibe — Premium E-Commerce",
    description: "Curated collection of premium products. Shop with confidence.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <MarketingScripts />
      </head>
      <body className={`${inter.className} antialiased min-h-screen bg-gray-950 text-white dark:bg-gray-950 dark:text-white`} suppressHydrationWarning>
        <GTMNoScript />
        <LiveVisitorTracker />
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
