"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import { Heart, Trash2, ShoppingCart } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Product { _id: string; name: string; price: number; description: string; imageUrls: string[]; category: string; stock: number; }

export default function WishlistPage() {
    const [items, setItems] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const ids: string[] = JSON.parse(localStorage.getItem("wishlist") || "[]");
        if (ids.length === 0) { setLoading(false); return; }
        Promise.all(ids.map(id => axios.get(`/api/products/${id}`).then(r => r.data).catch(() => null)))
            .then(results => { setItems(results.filter(Boolean)); setLoading(false); });
    }, []);

    const remove = (id: string) => {
        const ids: string[] = JSON.parse(localStorage.getItem("wishlist") || "[]");
        localStorage.setItem("wishlist", JSON.stringify(ids.filter(i => i !== id)));
        setItems(items.filter(i => i._id !== id));
        window.dispatchEvent(new Event("wishlist-updated"));
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 mb-4">
                    <Heart className="w-4 h-4 text-pink-400" /><span className="text-sm text-pink-300">Your Wishlist</span>
                </div>
                <h1 className="text-4xl font-bold gradient-text">Saved Items</h1>
                <p className="text-gray-400 mt-2">{items.length} items saved for later</p>
            </div>
            {loading ? <div className="text-center py-20 text-gray-500">Loading...</div> : items.length === 0 ? (
                <div className="glass-card p-16 text-center" style={{ transform: "none" }}>
                    <Heart className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-400 mb-2">Your wishlist is empty</h2>
                    <p className="text-gray-500 mb-6">Save products you like by clicking the heart icon.</p>
                    <Link href="/" className="btn-primary inline-flex items-center gap-2"><ShoppingCart className="w-4 h-4" />Browse Products</Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map(p => (
                        <div key={p._id} className="glass-card overflow-hidden group">
                            <div className="relative">
                                <img src={p.imageUrls?.[0]} alt={p.name} className="w-full h-52 object-cover" />
                                <button onClick={() => remove(p._id)} className="absolute top-3 right-3 p-2 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-5">
                                <h3 className="font-semibold text-lg mb-1">{p.name}</h3>
                                <p className="text-violet-400 font-bold text-xl mb-3">৳{p.price.toLocaleString()}</p>
                                <div className="flex gap-2">
                                    <Link href={`/product/${p._id}`} className="flex-1 text-center py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors">View</Link>
                                    <Link href={`/checkout?product=${p._id}&name=${encodeURIComponent(p.name)}&price=${p.price}`} className="flex-1 text-center py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm text-white font-medium hover:opacity-90 transition-opacity">Buy Now</Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
