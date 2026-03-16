"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sun, Moon, Heart, ShoppingCart, PackageSearch, Menu, X } from "lucide-react";
import { useCartStore } from "@/lib/cartStore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Navbar({ initialSettings }: { initialSettings?: Record<string, any> }) {
    const [dark, setDark] = useState(true);
    const [wishCount, setWishCount] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const cartCount = useCartStore((state) => state.totalItems);
    
    const marquee = initialSettings?.marquee as { text: string; enabled: boolean; speed?: number; bgColor?: string } | null ?? null;
    const branding = initialSettings?.storeBranding as { storeName: string; storeInitial: string; logoUrl: string } | null ?? null;

    useEffect(() => {
        // Theme initialization
        const isDark = document.documentElement.classList.contains("dark");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDark(() => isDark);

        // Wishlist count
        const wl = JSON.parse(localStorage.getItem("wishlist") || "[]");
        setWishCount(wl.length);

        const handler = () => { const w = JSON.parse(localStorage.getItem("wishlist") || "[]"); setWishCount(w.length); };
        window.addEventListener("wishlist-updated", handler);
        return () => { window.removeEventListener("wishlist-updated", handler); };
    }, []);

    const toggleTheme = () => {
        const newDark = !dark;
        if (newDark) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
        setDark(newDark);
    };

    return (
        <>
            <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--background)]/80 border-b border-[var(--card-border)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link href="/" className="flex items-center gap-2">
                            {branding?.logoUrl ? (
                                <Image src={branding.logoUrl} alt={branding.storeName || 'Store'} width={160} height={32} className="h-8 w-auto object-contain" />
                            ) : (
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm font-bold text-white">{branding?.storeInitial || 'S'}</div>
                            )}
                            <span className="text-xl font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">{branding?.storeName || 'ShopVibe'}</span>
                        </Link>
                        <div className="flex items-center gap-3 sm:gap-5">
                            <Link href="/" className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors hidden sm:block">Shop</Link>
                            <Link href="/track" className="text-sm font-medium text-[var(--text-muted)] hover:text-violet-500 transition-colors hidden sm:flex items-center gap-1"><PackageSearch className="w-4 h-4" /> Track Order</Link>
                            <Link href="/checkout" className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors hidden sm:block">Checkout</Link>
                            <Link href="/checkout" aria-label="Cart" className="relative text-[var(--text-muted)] hover:text-violet-500 transition-colors p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer">
                                <ShoppingCart className="w-5 h-5" />
                                {cartCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{cartCount}</span>}
                            </Link>
                            <Link href="/wishlist" aria-label="Wishlist" className="relative text-[var(--text-muted)] hover:text-pink-500 transition-colors p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer">
                                <Heart className="w-5 h-5" />
                                {wishCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{wishCount}</span>}
                            </Link>
                            <button onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
                                {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            {/* Mobile hamburger */}
                            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu" className="sm:hidden p-2 rounded-lg hover:bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
                                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {mobileMenuOpen && (
                    <div className="sm:hidden border-t border-[var(--card-border)] bg-[var(--background)]/95 backdrop-blur-xl animate-fade-in-up">
                        <div className="px-4 py-3 space-y-1">
                            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)] transition-colors">
                                Shop
                            </Link>
                            <Link href="/track" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-violet-500 hover:bg-[var(--card-bg)] transition-colors">
                                <PackageSearch className="w-4 h-4" /> Track Order
                            </Link>
                            <Link href="/checkout" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)] transition-colors">
                                Checkout
                            </Link>
                            <Link href="/wishlist" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-pink-500 hover:bg-[var(--card-bg)] transition-colors">
                                Wishlist {wishCount > 0 && <span className="ml-1 text-xs text-pink-500">({wishCount})</span>}
                            </Link>
                        </div>
                    </div>
                )}
            </nav>
            {/* Marquee Ticker */}
            {marquee?.enabled && marquee.text && (
                <div className={`overflow-hidden relative z-40 ${marquee.bgColor === 'red' ? 'bg-red-600' :
                    marquee.bgColor === 'blue' ? 'bg-blue-600' :
                        marquee.bgColor === 'green' ? 'bg-emerald-600' :
                            marquee.bgColor === 'orange' ? 'bg-orange-500' :
                                marquee.bgColor === 'black' ? 'bg-gray-900' :
                                    'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600'
                    }`}>
                    <div className="py-1.5">
                        <span className="marquee-text text-sm font-medium text-white" style={{ animationDuration: `${marquee.speed || 12}s` }}>{marquee.text}</span>
                    </div>
                </div>
            )}
        </>
    );
}
