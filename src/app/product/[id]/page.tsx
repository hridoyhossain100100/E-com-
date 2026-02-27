"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShoppingBag, Loader2, Heart, Share2, ZoomIn } from "lucide-react";
import Link from "next/link";
import Head from "next/head";

interface Product { _id: string; name: string; price: number; description: string; imageUrls: string[]; category: string; stock: number; variants: any[]; }

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ProductDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [mainIdx, setMainIdx] = useState(0);
    const [zoomed, setZoomed] = useState(false);
    const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
    const [inWish, setInWish] = useState(false);

    useEffect(() => {
        if (!id) return;
        axios.get(`/api/products/${id}`).then(r => setProduct(r.data)).catch(() => { }).finally(() => setLoading(false));
        const wl: string[] = JSON.parse(localStorage.getItem("wishlist") || "[]");
        setInWish(wl.includes(id as string));
    }, [id]);

    // Auto-slideshow: change image every 3 seconds
    useEffect(() => {
        if (!product || product.imageUrls.length <= 1) return;
        const timer = setInterval(() => {
            setMainIdx(prev => (prev + 1) % product.imageUrls.length);
        }, 3000);
        return () => clearInterval(timer);
    }, [product, mainIdx]);

    const toggleWish = () => {
        const wl: string[] = JSON.parse(localStorage.getItem("wishlist") || "[]");
        if (inWish) { localStorage.setItem("wishlist", JSON.stringify(wl.filter(i => i !== id))); }
        else { wl.push(id as string); localStorage.setItem("wishlist", JSON.stringify(wl)); }
        setInWish(!inWish);
        window.dispatchEvent(new Event("wishlist-updated"));
    };

    const share = () => {
        const url = window.location.href;
        const text = `Check out ${product?.name} on ShopVibe! ${url}`;
        if (navigator.share) navigator.share({ title: product?.name, text, url });
        else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    };

    const shareFB = () => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, "_blank"); };

    const handleZoomMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!zoomed) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setZoomPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-violet-500" /></div>;
    if (!product) return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
            <ShoppingBag className="w-16 h-16 text-gray-700 mb-4" /><h1 className="text-2xl font-bold mb-2">Product Not Found</h1>
            <p className="text-gray-400 mb-6">The product you&apos;re looking for doesn&apos;t exist.</p>
            <button onClick={() => router.back()} className="btn-primary">Go Back</button>
        </div>
    );

    return (
        <div className="min-h-screen pb-20">
            <Head><title>{product.name} — ShopVibe</title><meta name="description" content={product.description?.slice(0, 160)} /></Head>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
                <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors mb-6 sm:mb-8 group">
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back
                </button>

                <div className="glass-card p-4 sm:p-6 md:p-10" style={{ transform: "none" }}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
                        {/* Image Gallery with Zoom */}
                        <div className="space-y-3 sm:space-y-4">
                            <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-[var(--card-bg)] border border-[var(--card-border)] cursor-zoom-in"
                                onClick={() => setZoomed(!zoomed)} onMouseMove={handleZoomMove} onMouseLeave={() => setZoomed(false)}>
                                {product.imageUrls?.length > 0 ? (
                                    <img src={product.imageUrls[mainIdx]} alt={product.name}
                                        className="w-full h-full object-cover transition-transform duration-300"
                                        style={zoomed ? { transform: "scale(2.5)", transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : {}} />
                                ) : <div className="w-full h-full flex items-center justify-center text-gray-600"><ShoppingBag className="w-16 h-16" /></div>}
                                <div className="absolute top-3 right-3 flex gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); toggleWish(); }} className={`p-2 rounded-full backdrop-blur-sm ${inWish ? "bg-pink-500 text-white" : "bg-black/40 text-white hover:bg-pink-500/80"}`}>
                                        <Heart className={`w-5 h-5 ${inWish ? "fill-current" : ""}`} />
                                    </button>
                                </div>
                                {!zoomed && <div className="absolute bottom-3 right-3 p-2 rounded-full bg-black/40 text-white/60"><ZoomIn className="w-4 h-4" /></div>}
                            </div>
                            {product.imageUrls?.length > 1 && (
                                <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2">
                                    {product.imageUrls.map((url, idx) => (
                                        <button key={idx} onClick={() => setMainIdx(idx)}
                                            className={`relative w-16 sm:w-24 aspect-[3/4] flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${mainIdx === idx ? "border-violet-500 scale-105" : "border-transparent opacity-60 hover:opacity-100"}`}>
                                            <img src={url} alt="" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Product Info */}
                        <div className="flex flex-col">
                            {product.category && product.category !== "General" && (
                                <span className="text-xs text-violet-500 dark:text-violet-400 font-medium bg-violet-500/10 px-3 py-1 rounded-full w-fit mb-3">{product.category}</span>
                            )}
                            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 gradient-text">{product.name}</h1>

                            <div className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-6 sm:mb-8">৳{product.price.toLocaleString()}</div>

                            <div className="border-t border-[var(--card-border)] pt-6 sm:pt-8 mb-6 sm:mb-10 text-[var(--text-muted)]">
                                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Description</h3>
                                <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">{product.description}</p>
                            </div>

                            {/* Variants */}
                            {product.variants?.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Variants</h3>
                                    <div className="flex flex-wrap gap-2">{product.variants.map((v: any, i: number) => (
                                        <span key={i} className="px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)]">{v.label} {v.stock > 0 ? `(${v.stock})` : "(Out)"}</span>
                                    ))}</div>
                                </div>
                            )}

                            {/* Social Share */}
                            <div className="flex items-center gap-3 mb-6 sm:mb-8">
                                <span className="text-sm text-[var(--text-muted)]">Share:</span>
                                <button onClick={share} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors" title="WhatsApp"><Share2 className="w-4 h-4" /></button>
                                <button onClick={shareFB} className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Facebook">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
                                </button>
                            </div>

                            <div className="mt-auto">
                                {(product.stock || 0) > 0 ? (
                                    <Link href={`/checkout?product=${product._id}&name=${encodeURIComponent(product.name)}&price=${product.price}`}
                                        className="w-full btn-primary text-base sm:text-lg py-3 sm:py-4 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
                                        <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" /> Proceed to Checkout
                                    </Link>
                                ) : <div className="w-full py-4 text-center bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl text-[var(--text-muted)] font-medium">Out of Stock</div>}
                                {(product.stock || 0) > 0 && <p className="text-center text-sm text-[var(--text-muted)] mt-3 flex items-center justify-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />{product.stock} in stock</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
