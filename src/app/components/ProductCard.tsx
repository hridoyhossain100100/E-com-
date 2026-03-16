"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Share2 } from "lucide-react";

export interface Product {
    _id: string;
    name: string;
    price: number;
    description: string;
    imageUrls: string[];
    category: string;
    stock: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    variants: any[];
    createdAt: string;
}

export interface ProductCardProps {
    product: Product;
    isWishlisted: boolean;
    onWishlist: (id: string) => void;
    onShare: (product: Product) => void;
    onAddToCart: (product: Product) => void;
    isNewArrival?: boolean;
    animationDelay?: string;
}

export default function ProductCard({
    product: p,
    isWishlisted,
    onWishlist,
    onShare,
    onAddToCart,
    isNewArrival,
    animationDelay
}: ProductCardProps) {
    return (
        <div
            className="glass-card overflow-hidden group animate-fade-in-up cursor-pointer flex flex-col h-full"
            style={{ animationDelay }}
        >
            <div className="relative overflow-hidden w-full h-48 sm:h-56 shrink-0 bg-[var(--border-dim)]/20">
                <Link href={`/product/${p._id}`}>
                    <Image
                        src={p.imageUrls?.[0] || ""}
                        alt={p.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500 will-change-transform"
                        sizes={
                            isNewArrival
                                ? "(max-width: 768px) 50vw, 25vw"
                                : "(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        }
                        priority={isNewArrival}
                    />
                </Link>
                {/* Wishlist + Share buttons */}
                <div className="absolute top-2 right-2 flex gap-1.5 z-10">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            onWishlist(p._id);
                        }}
                        className={`p-2 rounded-full backdrop-blur-md transition-all ${isWishlisted
                            ? "bg-pink-500 text-white shadow-md shadow-pink-500/20"
                            : "bg-black/40 text-white hover:bg-pink-500 hover:text-white"
                            }`}
                        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                    >
                        <Heart className={`w-4 h-4 ${isWishlisted ? "fill-current" : ""}`} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            onShare(p);
                        }}
                        className="p-2 rounded-full bg-black/40 text-white hover:bg-violet-500 backdrop-blur-md transition-all"
                        aria-label="Share product"
                    >
                        <Share2 className="w-4 h-4" />
                    </button>
                </div>
                {/* Badges */}
                {isNewArrival ? (
                    <span className="absolute top-2 left-2 px-2.5 py-1 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white text-[10px] font-bold rounded-full uppercase shadow-md shadow-pink-500/30 z-10">
                        New
                    </span>
                ) : (
                    <>
                        {(p.stock || 0) <= 0 && (
                            <span className="absolute top-2 left-2 px-2.5 py-1 bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-full z-10">
                                Out of Stock
                            </span>
                        )}
                        {p.category && p.category !== "General" && (p.stock || 0) > 0 && (
                            <span className="absolute top-2 left-2 px-2.5 py-1 bg-violet-500/80 backdrop-blur-md text-white text-[10px] font-bold rounded-full shadow-sm z-10">
                                {p.category}
                            </span>
                        )}
                    </>
                )}
            </div>
            
            <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between">
                <div>
                    <Link href={`/product/${p._id}`}>
                        <h3 className="font-semibold text-sm sm:text-base mb-1.5 truncate group-hover:text-violet-500 transition-colors">
                            {p.name}
                        </h3>
                    </Link>
                    <p className="text-xs text-[var(--text-muted)] mb-4 line-clamp-2 leading-relaxed">
                        {p.description}
                    </p>
                </div>
                <div className="flex flex-col gap-3 mt-auto">
                    <span className="text-violet-500 dark:text-violet-400 font-bold text-lg leading-none">
                        ৳{p.price.toLocaleString()}
                    </span>
                    <div className="flex gap-2">
                        {(p.stock || 0) > 0 ? (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onAddToCart(p);
                                    }}
                                    className="flex-1 px-3 py-2 sm:py-2.5 bg-transparent border border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 rounded-xl text-xs sm:text-sm font-semibold transition-all text-center inline-flex items-center justify-center"
                                >
                                    Add to Cart
                                </button>
                                <Link
                                    href={`/checkout?product=${p._id}&name=${encodeURIComponent(p.name)}&price=${p.price}`}
                                    className="flex-1 px-3 py-2 sm:py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all text-center inline-flex items-center justify-center shadow-lg shadow-violet-500/25"
                                >
                                    Buy Now
                                </Link>
                            </>
                        ) : (
                            <span className="w-full text-center px-4 py-2.5 bg-[var(--border-dim)]/40 rounded-xl text-xs sm:text-sm font-semibold text-[var(--text-muted)] border border-[var(--border-dim)]">
                                Sold Out
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
