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

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onWishlist: (id: string) => void;
  onShare: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  isNewArrival?: boolean;
  animationDelay?: string;
}

function ProductCard({ product: p, isWishlisted, onWishlist, onShare, onAddToCart, isNewArrival, animationDelay }: ProductCardProps) {
  return (
    <div className="glass-card overflow-hidden group animate-fade-in-up cursor-pointer" style={{ animationDelay }}>
      <div className="relative overflow-hidden w-full h-48 sm:h-56">
        <Link href={`/product/${p._id}`}>
          <Image src={p.imageUrls?.[0] || ""} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes={isNewArrival ? "(max-width: 768px) 50vw, 25vw" : "(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"} priority={isNewArrival} />
        </Link>
        {/* Wishlist + Share buttons */}
        <div className="absolute top-2 right-2 flex gap-1.5">
          <button onClick={(e) => { e.preventDefault(); onWishlist(p._id); }} className={`p-2 rounded-full backdrop-blur-sm transition-all ${isWishlisted ? "bg-pink-500 text-white" : "bg-black/40 text-white hover:bg-pink-500/80"}`}>
            <Heart className={`w-4 h-4 ${isWishlisted ? "fill-current" : ""}`} />
          </button>
          <button onClick={(e) => { e.preventDefault(); onShare(p); }} className="p-2 rounded-full bg-black/40 text-white hover:bg-violet-500/80 backdrop-blur-sm transition-all">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        {/* Badges */}
        {isNewArrival ? (
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-fuchsia-500 text-white text-[10px] font-bold rounded-full uppercase shadow-md shadow-fuchsia-500/20">New</span>
        ) : (
          <>
            {(p.stock || 0) === 0 && <span className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">Out of Stock</span>}
            {p.category && p.category !== "General" && (p.stock || 0) > 0 && <span className="absolute top-2 left-2 px-2 py-0.5 bg-violet-500/80 text-white text-[10px] font-bold rounded-full backdrop-blur-sm">{p.category}</span>}
          </>
        )}
      </div>
      <div className="p-4 sm:p-5 flex flex-col min-h-[140px] flex-1 justify-between">
        <div>
          <Link href={`/product/${p._id}`}>
            <h3 className="font-semibold text-sm sm:text-base mb-1 truncate hover:text-primary transition-colors">{p.name}</h3>
          </Link>
          <p className="text-xs text-[var(--text-muted)] mb-3 line-clamp-2">{p.description}</p>
        </div>
        <div className="flex flex-col gap-3 mt-auto">
          <span className="text-violet-400 font-bold text-lg leading-none">৳{p.price.toLocaleString()}</span>
          <div className="flex gap-2">
            {(p.stock || 0) > 0 ? (
              <>
                <button onClick={(e) => { e.preventDefault(); onAddToCart(p); }} className="flex-1 px-3 py-2 bg-transparent border border-primary text-primary hover:bg-primary/10 rounded-md text-sm font-medium transition-colors text-center inline-flex items-center justify-center">
                  Add to Cart
                </button>
                <Link href={`/checkout?product=${p._id}&name=${encodeURIComponent(p.name)}&price=${p.price}`}
                  className="flex-1 px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-medium transition-colors text-center inline-flex items-center justify-center shadow-md shadow-primary/20">
                  Buy Now
                </Link>
              </>
            ) : (
              <span className="w-full text-center px-3 py-1.5 bg-[var(--border-dim)]/50 rounded-lg text-xs font-medium text-[var(--text-muted)]">Sold Out</span>
            )}
          </div>
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

  const addToCart = (p: Product) => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find((item: any) => item.productId === p._id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ productId: p._id, name: p.name, price: p.price, quantity: 1, imageUrl: p.imageUrls?.[0] || "" });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
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
            <p className="text-sm sm:text-base text-[var(--foreground)] font-medium">{banner.text}</p>
            <button onClick={() => setBanner({ ...banner, enabled: false })} className="absolute top-2 right-3 p-1 rounded-full hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--foreground)]"><X className="w-3.5 h-3.5" /></button>
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
              <br /><span className="text-[var(--foreground)]">{hero.titleHighlight || 'Products'}</span>
            </h1>
            <p className="text-[var(--text-muted)] text-base sm:text-lg max-w-xl mx-auto mb-8">
              {hero.description || 'Curated collection of premium products. Shop with confidence. Enjoy Cash on Delivery.'}
            </p>
            {/* Search Bar */}
            <div className="max-w-lg mx-auto relative mt-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-12 pr-4 py-3.5 text-base bg-[var(--bg-card)]/80 border border-[var(--border-dim)] rounded-2xl text-[var(--foreground)] placeholder-[var(--text-dim)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary focus:border-transparent backdrop-blur-md transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
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
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-dim)] hover:bg-[var(--glass-hover)]"}`}>
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
              {newArrivals.map((p, i) => (
                <ProductCard
                  key={p._id}
                  product={p}
                  isWishlisted={wishlist.has(p._id)}
                  onWishlist={toggleWish}
                  onShare={shareProduct}
                  onAddToCart={addToCart}
                  isNewArrival={true}
                  animationDelay={`${i * 0.05}s`}
                />
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
            <Search className="w-12 h-12 text-[var(--border-dim)] mx-auto mb-3" />
            <p className="text-[var(--text-muted)]">No products found.</p>
          </div>
        ) : (
          <div className={`grid gap-4 sm:gap-6 ${filtered.length === 1 ? "grid-cols-1 max-w-md mx-auto" : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
            {filtered.map((p, i) => (
              <ProductCard
                key={p._id}
                product={p}
                isWishlisted={wishlist.has(p._id)}
                onWishlist={toggleWish}
                onShare={shareProduct}
                onAddToCart={addToCart}
                animationDelay={`${i * 0.05}s`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══ PREMIUM FOOTER ═══ */}
      <footer className="border-t border-[var(--border-dim)] mt-16">
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
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{contact.address || '123 Commerce Avenue, Dhaka, Bangladesh'}</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><Phone className="w-4 h-4 text-[var(--text-dim)]" />{contact.phone || '+880 1XXXXXXXXX'}</li>
                <li className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><Mail className="w-4 h-4 text-[var(--text-dim)]" />{contact.email || 'support@shopvibe.com'}</li>
              </ul>
            </div>

            {/* Payment */}
            <div>
              <h4 className="font-semibold text-sm text-[var(--foreground)] mb-4 uppercase tracking-wider">We Accept</h4>
              <div className="flex flex-wrap gap-2">
                {(footer.paymentMethods || ["Cash on Delivery"]).map((m: string) => (
                  <span key={m} className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-lg text-xs font-medium text-[var(--text-muted)]">{m}</span>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-[var(--text-dim)]">SSL Secured Payments</span>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-[var(--border-dim)] mt-10 pt-8 text-center">
            <p className="text-xs text-[var(--text-dim)]">{(footer.copyrightText || `© {year} ${storeName}. All rights reserved. Made with 💜 in Bangladesh`).replace('{year}', String(new Date().getFullYear()))}</p>
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
