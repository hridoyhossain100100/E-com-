"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { Sun, Moon, Heart, ShoppingCart } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Navbar() {
    const [dark, setDark] = useState(true);
    const [wishCount, setWishCount] = useState(0);
    const [cartCount, setCartCount] = useState(0);
    const [marquee, setMarquee] = useState<{ text: string; enabled: boolean; speed?: number; bgColor?: string } | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem("theme");
        if (saved === "light") { setDark(false); document.documentElement.classList.remove("dark"); }
        else { setDark(true); document.documentElement.classList.add("dark"); }
        // Wishlist count
        const wl = JSON.parse(localStorage.getItem("wishlist") || "[]");
        setWishCount(wl.length);
        // Cart count
        const ct = JSON.parse(localStorage.getItem("cart") || "[]");
        setCartCount(ct.length);
        // Fetch marquee setting
        axios.get(`/api/settings`).then(r => { if (r.data.marquee) setMarquee(r.data.marquee); }).catch(() => { });

        const handler = () => { const w = JSON.parse(localStorage.getItem("wishlist") || "[]"); setWishCount(w.length); };
        const cartHandler = () => { const c = JSON.parse(localStorage.getItem("cart") || "[]"); setCartCount(c.length); };
        window.addEventListener("wishlist-updated", handler);
        window.addEventListener("cart-updated", cartHandler);
        return () => { window.removeEventListener("wishlist-updated", handler); window.removeEventListener("cart-updated", cartHandler); };
    }, []);

    const toggleTheme = () => {
        if (dark) { document.documentElement.classList.remove("dark"); localStorage.setItem("theme", "light"); }
        else { document.documentElement.classList.add("dark"); localStorage.setItem("theme", "dark"); }
        setDark(!dark);
    };

    return (
        <>
            <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--background)]/80 border-b border-[var(--card-border)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm font-bold text-white">S</div>
                            <span className="text-xl font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">ShopVibe</span>
                        </Link>
                        <div className="flex items-center gap-3 sm:gap-5">
                            <Link href="/" className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors hidden sm:block">Shop</Link>
                            <Link href="/checkout" className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors hidden sm:block">Checkout</Link>
                            <Link href="/checkout" className="relative text-[var(--text-muted)] hover:text-violet-500 transition-colors p-1">
                                <ShoppingCart className="w-5 h-5" />
                                {cartCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{cartCount}</span>}
                            </Link>
                            <Link href="/wishlist" className="relative text-[var(--text-muted)] hover:text-pink-500 transition-colors p-1">
                                <Heart className="w-5 h-5" />
                                {wishCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{wishCount}</span>}
                            </Link>
                            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
                                {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>
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
