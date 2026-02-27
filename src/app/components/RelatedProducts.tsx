"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import { ShoppingBag, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Product { _id: string; name: string; price: number; imageUrls: string[]; category: string; }

export default function RelatedProducts({ currentId, category }: { currentId: string; category: string }) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!category) return;

        const fetchRelated = async () => {
            try {
                const res = await axios.get(`${API}/api/products`);
                let related = res.data.filter((p: Product) => p.category === category && p._id !== currentId);

                // If not enough in category, fetch some random ones
                if (related.length < 4) {
                    const fallback = res.data.filter((p: Product) => p._id !== currentId && !related.find((r: Product) => r._id === p._id));
                    related = [...related, ...fallback].slice(0, 4);
                }

                // Shuffle Array
                setProducts(related.sort(() => Math.random() - 0.5).slice(0, 4));
            } catch { } finally { setLoading(false); }
        };

        fetchRelated();
    }, [category, currentId]);

    if (loading) return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>;
    if (products.length === 0) return null;

    return (
        <div className="mt-16 sm:mt-24">
            <h2 className="text-2xl sm:text-3xl font-bold mb-8 gradient-text">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {products.map((p) => (
                    <Link key={p._id} href={`/product/${p._id}`} className="group glass-card p-3 sm:p-4 hover:border-violet-500/50 transition-all flex flex-col h-full">
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3 sm:mb-4 bg-gray-900/50">
                            {p.imageUrls?.length > 0 ? (
                                <img src={p.imageUrls[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                    <ShoppingBag className="w-8 h-8" />
                                </div>
                            )}
                        </div>
                        <h3 className="font-semibold text-sm sm:text-base text-gray-200 group-hover:text-violet-400 transition-colors line-clamp-2">{p.name}</h3>
                        <div className="mt-auto pt-2 flex items-center justify-between">
                            <span className="font-bold text-violet-400">৳{p.price.toLocaleString()}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
