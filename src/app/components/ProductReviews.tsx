"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Star, MessageSquareQuote, Loader2, User } from "lucide-react";

export default function ProductReviews({ productId }: { productId: string }) {
    const [reviews, setReviews] = useState<any[]>([]);
    const [avg, setAvg] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState("");
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState("");

    const fetchReviews = async () => {
        try {
            const res = await axios.get(`/api/reviews/${productId}`);
            setReviews(res.data.reviews);
            setAvg(res.data.averageRating);
            setTotal(res.data.totalReviews);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => {
        if (productId) fetchReviews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setMsg("");
        try {
            await axios.post(`/api/reviews/${productId}`, {
                customerName: name, rating, comment
            });
            setMsg("Review submitted successfully! Thank you 🙌");
            setName(""); setComment(""); setRating(5);
            fetchReviews();
        } catch (err: any) {
            setMsg(err.response?.data?.message || "Failed to submit review.");
        } finally {
            setSubmitting(false);
            setTimeout(() => setMsg(""), 5000);
        }
    };

    if (loading) return <div className="h-32 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>;

    return (
        <div className="mt-16 sm:mt-24 border-t border-[var(--card-border)] pt-12 sm:pt-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-8 flex items-center gap-3"><MessageSquareQuote className="w-6 h-6 sm:w-8 sm:h-8 text-violet-400" /> Customer Reviews</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Stats & Form */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Overall Rating */}
                    <div className="glass-card p-6 text-center" style={{ transform: "none" }}>
                        <div className="text-5xl font-bold gradient-text mb-2">{avg.toFixed(1)}</div>
                        <div className="flex items-center justify-center gap-1 text-amber-400 mb-2">
                            {[1, 2, 3, 4, 5].map(star => (
                                <Star key={star} className={`w-5 h-5 ${star <= Math.round(avg) ? 'fill-current' : 'text-gray-600'}`} />
                            ))}
                        </div>
                        <p className="text-sm text-gray-400">Based on {total} review(s)</p>
                    </div>

                    {/* Write Review Form */}
                    <div className="glass-card p-6" style={{ transform: "none" }}>
                        <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Your Name</label>
                                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Rating</label>
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button type="button" key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                                            <Star className={`w-6 h-6 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Comment (Optional)</label>
                                <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} className="input-field resize-none" placeholder="What did you like or dislike?"></textarea>
                            </div>
                            <button type="submit" disabled={submitting} className="w-full btn-primary py-3 rounded-xl">
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Submit Review"}
                            </button>
                            {msg && <p className={`text-sm text-center ${msg.includes("success") ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</p>}
                        </form>
                    </div>
                </div>

                {/* Reviews List */}
                <div className="lg:col-span-2 space-y-4">
                    {reviews.length === 0 ? (
                        <div className="glass-card p-10 text-center flex flex-col items-center justify-center" style={{ transform: "none" }}>
                            <Star className="w-12 h-12 text-gray-600 mb-3" />
                            <p className="text-gray-400 text-lg">No reviews yet.</p>
                            <p className="text-sm text-gray-500">Be the first to review this product!</p>
                        </div>
                    ) : (
                        reviews.map((rev) => (
                            <div key={rev._id} className="glass-card p-5 sm:p-6" style={{ transform: "none" }}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                                            <User className="w-5 h-5 text-violet-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-200">{rev.customerName}</h4>
                                            <p className="text-xs text-gray-500">{new Date(rev.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 text-amber-400">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star key={star} className={`w-3.5 h-3.5 ${star <= rev.rating ? 'fill-current' : 'text-gray-700'}`} />
                                        ))}
                                    </div>
                                </div>
                                {rev.comment && <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap pl-1">{rev.comment}</p>}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
