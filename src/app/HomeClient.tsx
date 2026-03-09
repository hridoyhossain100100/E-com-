"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import Image from "next/image";
import { Search, Heart, Share2, ShoppingBag, Sparkles, ArrowRight, Filter, X, Shield, Truck, CreditCard, ChevronUp, Facebook, Instagram, Mail, Phone, MapPin } from "lucide-react";

interface Product {
  _id: string; name: string; price: number; description: string;
  imageUrls: string[]; category: string; stock: number; variants: any[]; createdAt: string;
}

// Skeleton Card
function SkeletonCard() {
  return (
    <div className="glass-card overflow-hidden" style={{ transform: "none" }}>
      <div className="skeleton h-48 sm:h-56 w-full" />
      <div className="p-4 sm:p-5 space-y-3">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-1/2" />
        <div className="flex justify-between items-center">
          <div className="skeleton h-6 w-20" />
          <div className="skeleton h-8 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function HomeClient({ initialProducts = [], initialSettings = {} }: { initialProducts?: Product[], initialSettings?: any }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [banner, setBanner] = useState<{ text: string; enabled: boolean } | null>(initialSettings.banner || null);
  const [loading, setLoading] = useState(false); // No longer loading initially
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [settings, setSettings] = useState<any>(initialSettings);

  useEffect(() => {
    // @react-best-practices: Lazy state initialization from localStorage
    const wl: string[] = JSON.parse(localStorage.getItem("wishlist") || "[]");
    setWishlist(new Set(wl));

    // @react-best-practices: Passive scroll listener for better performance
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  const toggleWish = (id: string) => {
    const wl = new Set(wishlist);
    wl.has(id) ? wl.delete(id) : wl.add(id);
    setWishlist(wl);
    localStorage.setItem("wishlist", JSON.stringify(Array.from(wl)));
    window.dispatchEvent(new Event("wishlist-updated"));
  };

  const shareProduct = (p: Product) => {
    const url = `${window.location.origin}/product/${p._id}`;
    const text = `Check out ${p.name} for ৳${p.price.toLocaleString()} on ShopVibe! ${url}`;
    if (navigator.share) { navigator.share({ title: p.name, text, url }); }
    else { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank"); }
  };

  const categories = ["All", ...Array.from(new Set(products.map(p => p.category || "General")))];
  const filtered = products
    .filter(p => (category === "All" || p.category === category))
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()));

  const newArrivals = [...products].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4);

  // Dynamic settings helpers
  const hero = settings.heroContent || {};
  const branding = settings.storeBranding || {};
  const contact = settings.contactInfo || {};
  const social = settings.socialLinks || {};
  const footer = settings.footerContent || {};
  const storeName = branding.storeName || 'ShopVibe';
  const storeInitial = branding.storeInitial || 'S';

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Banner */}
        {banner?.enabled && banner.text && (
          <div className="mb-8 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-violet-600/20 via-fuchsia-500/20 to-pink-500/20 border border-violet-500/20 text-center relative animate-fade-in-up">
            <p className="text-sm sm:text-base text-gray-200 font-medium">{banner.text}</p>
            <button onClick={() => setBanner({ ...banner, enabled: false })} className="absolute top-2 right-3 p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* ═══ ANIMATED HERO ═══ */}
        <div className="hero-gradient rounded-2xl sm:rounded-3xl p-5 sm:p-12 lg:p-16 mb-8 sm:mb-16 relative overflow-hidden">
          {/* Floating shapes */}
          <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-violet-500/10 blur-xl float-shape" />
          <div className="absolute bottom-10 right-10 w-32 h-32 rounded-full bg-fuchsia-500/10 blur-xl float-shape-reverse" />
          <div className="absolute top-1/2 left-1/4 w-16 h-16 rounded-full bg-pink-500/8 blur-lg float-shape" style={{ animationDelay: "2s" }} />
          <div className="absolute bottom-1/3 right-1/3 w-24 h-24 rounded-full bg-violet-400/8 blur-xl float-shape-reverse" style={{ animationDelay: "4s" }} />
          <div className="absolute top-1/4 right-1/4 w-12 h-12 border border-violet-500/20 rounded-lg rotate-45 float-shape" style={{ animationDelay: "1s" }} />
          <div className="absolute bottom-1/4 left-1/3 w-8 h-8 border border-fuchsia-500/20 rounded-full float-shape-reverse" style={{ animationDelay: "3s" }} />

          <div className="text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-violet-300">{hero.badge || 'Premium Collection'}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-4 tracking-tight">
              <span className="gradient-text">{hero.title || 'Discover Quality'}</span>
              <br /><span className="text-white">{hero.titleHighlight || 'Products'}</span>
            </h1>
            <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto mb-8">
              {hero.description || 'Curated collection of premium products. Shop with confidence, pay with Bkash, Nagad or Rocket.'}
            </p>
            {/* Search Bar */}
            <div className="max-w-lg mx-auto relative mt-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-12 pr-4 py-3.5 text-base bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-300 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 backdrop-blur-sm transition-all"
              />
            </div>
          </div>
        </div>


        {/* Category Pills */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <Filter className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${category === c
                ? "bg-violet-600/30 text-violet-600 dark:text-violet-300 border border-violet-500/30"
                : "bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--card-border)] hover:bg-[var(--glass-hover)]"}`}>
              {c}
            </button>
          ))}
        </div>

        {/* New Arrivals */}
        {search === "" && category === "All" && newArrivals.length > 0 && !loading && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-fuchsia-400" /> New Arrivals
              </h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {newArrivals.map(p => (
                <Link key={p._id} href={`/product/${p._id}`} className="glass-card overflow-hidden group cursor-pointer">
                  <div className="relative overflow-hidden w-full h-40 sm:h-48">
                    <Image src={p.imageUrls?.[0] || ""} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 50vw, 25vw" priority={true} />
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-fuchsia-500 text-white text-[10px] font-bold rounded-full uppercase">New</span>
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="font-medium text-[var(--foreground)] text-sm sm:text-base truncate">{p.name}</h3>
                    <p className="text-violet-600 dark:text-violet-400 font-bold mt-1">৳{p.price.toLocaleString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All Products */}
        <div className="mb-6"><h2 className="text-2xl font-bold flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-violet-400" /> All Products {!loading && `(${filtered.length})`}</h2></div>

        {/* ═══ LOADING SKELETON ═══ */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-16 text-center" style={{ transform: "none" }}>
            <Search className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">No products found.</p>
          </div>
        ) : (
          <div className={`grid gap-4 sm:gap-6 ${filtered.length === 1 ? "grid-cols-1 max-w-md mx-auto" : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
            {filtered.map((p, i) => (
              <div key={p._id} className="glass-card overflow-hidden group animate-fade-in-up cursor-pointer" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="relative overflow-hidden w-full h-48 sm:h-56">
                  <Link href={`/product/${p._id}`}>
                    <Image src={p.imageUrls?.[0] || ""} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw" />
                  </Link>
                  {/* Wishlist + Share buttons */}
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <button onClick={() => toggleWish(p._id)} className={`p-2 rounded-full backdrop-blur-sm transition-all ${wishlist.has(p._id) ? "bg-pink-500 text-white" : "bg-black/40 text-white hover:bg-pink-500/80"}`}>
                      <Heart className={`w-4 h-4 ${wishlist.has(p._id) ? "fill-current" : ""}`} />
                    </button>
                    <button onClick={() => shareProduct(p)} className="p-2 rounded-full bg-black/40 text-white hover:bg-violet-500/80 backdrop-blur-sm transition-all">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Badges */}
                  {(p.stock || 0) === 0 && <span className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">Out of Stock</span>}
                  {p.category && p.category !== "General" && (p.stock || 0) > 0 && <span className="absolute top-2 left-2 px-2 py-0.5 bg-violet-500/80 text-white text-[10px] font-bold rounded-full backdrop-blur-sm">{p.category}</span>}
                </div>
                <div className="p-4 sm:p-5">
                  <Link href={`/product/${p._id}`}>
                    <h3 className="font-semibold text-sm sm:text-base mb-1 truncate hover:text-violet-400 transition-colors">{p.name}</h3>
                  </Link>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{p.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-violet-400 font-bold text-lg">৳{p.price.toLocaleString()}</span>
                    {(p.stock || 0) > 0 ? (
                      <Link href={`/checkout?product=${p._id}&name=${encodeURIComponent(p.name)}&price=${p.price}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg text-xs sm:text-sm font-medium text-white hover:opacity-90 transition-opacity">
                        Buy Now <ArrowRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span className="px-3 py-1.5 bg-gray-800 rounded-lg text-xs font-medium text-gray-500">Sold Out</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ PREMIUM FOOTER ═══ */}
      <footer className="border-t border-gray-800/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt={storeName} className="h-8 object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm font-bold text-white">{storeInitial}</div>
                )}
                <span className="text-xl font-bold gradient-text">{storeName}</span>
              </Link>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
                {footer.description || 'Your trusted destination for premium products in Bangladesh. Quality guaranteed.'}
              </p>
              <div className="flex gap-3">
                {(social.facebook || !settings.socialLinks) && <a href={social.facebook || '#'} target="_blank" rel="noreferrer" aria-label="Facebook" className="w-11 h-11 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-muted)] hover:text-blue-500 hover:border-blue-500/30 transition-all cursor-pointer"><Facebook className="w-5 h-5" /></a>}
                {(social.instagram || !settings.socialLinks) && <a href={social.instagram || '#'} target="_blank" rel="noreferrer" aria-label="Instagram" className="w-11 h-11 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-muted)] hover:text-pink-500 hover:border-pink-500/30 transition-all cursor-pointer"><Instagram className="w-5 h-5" /></a>}
                {(social.whatsapp || !settings.socialLinks) && <a href={social.whatsapp || '#'} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="w-11 h-11 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-muted)] hover:text-emerald-500 hover:border-emerald-500/30 transition-all cursor-pointer">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                </a>}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-sm text-[var(--foreground)] mb-4 uppercase tracking-wider">Quick Links</h4>
              <ul className="space-y-2.5">
                {(footer.quickLinks || [{ label: "Shop", href: "/" }, { label: "Checkout", href: "/checkout" }, { label: "Wishlist", href: "/wishlist" }]).map((l: any) => (
                  <li key={l.label}><Link href={l.href} className="text-sm text-[var(--text-muted)] hover:text-violet-500 transition-colors">{l.label}</Link></li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-sm text-[var(--foreground)] mb-4 uppercase tracking-wider">Contact</h4>
              <ul className="space-y-2.5">
                <li className="flex gap-3 text-sm text-[var(--text-muted)]">
                  <MapPin className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                  <span>{contact.address || '123 Commerce Avenue, Dhaka, Bangladesh'}</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><Phone className="w-4 h-4 text-gray-600" />{contact.phone || '+880 1XXXXXXXXX'}</li>
                <li className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><Mail className="w-4 h-4 text-gray-600" />{contact.email || 'support@shopvibe.com'}</li>
              </ul>
            </div>

            {/* Payment */}
            <div>
              <h4 className="font-semibold text-sm text-[var(--foreground)] mb-4 uppercase tracking-wider">We Accept</h4>
              <div className="flex flex-wrap gap-2">
                {(footer.paymentMethods || ["Bkash", "Nagad", "Rocket"]).map((m: string) => (
                  <span key={m} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-gray-400">{m}</span>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-gray-500">SSL Secured Payments</span>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-800/50 mt-10 pt-8 text-center">
            <p className="text-xs text-gray-600">{(footer.copyrightText || `© {year} ${storeName}. All rights reserved. Made with 💜 in Bangladesh`).replace('{year}', String(new Date().getFullYear()))}</p>
          </div>
        </div>
      </footer>

      {/* ═══ SCROLL TO TOP ═══ */}
      {showScrollTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Scroll to top"
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center scroll-top-btn hover:shadow-violet-500/50 transition-shadow cursor-pointer">
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
