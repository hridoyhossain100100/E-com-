"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, ShoppingBag, Loader2, Heart, Share2, ZoomIn, Phone, CheckCircle, AlertCircle, ShoppingCart, User, Tag, MapPin, Truck, ShieldCheck, Plus, Minus, ChevronRight, ChevronLeft, ChevronDown, Package, Zap, Info, Star, Shield, RefreshCcw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { trackViewContent, trackAddToCart, trackPurchase } from "@/lib/pixel";

// @web-performance-optimization: Lazy load non-critical components
const ProductReviews = dynamic(() => import("../../components/ProductReviews"), {
    loading: () => <div className="h-40 flex items-center justify-center bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)]"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>,
    ssr: false
});

const RelatedProducts = dynamic(() => import("../../components/RelatedProducts"), {
    loading: () => <div className="h-60 flex items-center justify-center bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)]"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>,
    ssr: false
});

export interface Product { _id: string; name: string; price: number; description: string; descriptionSections?: { title: string; content: string; }[]; imageUrls: string[]; videoUrl?: string; category: string; stock: number; variants: any[]; }

// Helper: Parse description into structured sections (headers, bullet points, paragraphs)
interface DescriptionSection {
    title?: string;
    bullets: string[];
    paragraphs: string[];
}

function parseDescription(desc: string): DescriptionSection[] {
    const lines = desc.split('\n').map(l => l.trim());
    const sections: DescriptionSection[] = [];
    let currentSection: DescriptionSection = { bullets: [], paragraphs: [] };

    for (const line of lines) {
        if (!line) continue;

        // Detect potential headers (ends with ':' or matches markdown style headers)
        if (line.endsWith(':') || line.startsWith('###') || line.startsWith('**')) {
            if (currentSection.bullets.length > 0 || currentSection.paragraphs.length > 0) {
                sections.push(currentSection);
            }
            currentSection = {
                title: line.replace(/^[#*\s]+|[#*\s:]+$/g, ''),
                bullets: [],
                paragraphs: []
            };
            continue;
        }

        if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || line.startsWith('✓') || line.startsWith('✅')) {
            currentSection.bullets.push(line.replace(/^[•\-*✓✅]\s*/, ''));
        } else {
            currentSection.paragraphs.push(line);
        }
    }

    if (currentSection.bullets.length > 0 || currentSection.paragraphs.length > 0) {
        sections.push(currentSection);
    }

    return sections;
}

export default function ProductDetailsClient({
    initialProduct,
    productId,
    initialSettings = {},
    initialShipping = { zones: [{ id: "dhaka", label: "ঢাকার ভেতরে", cost: 60 }, { id: "outside", label: "ঢাকার বাইরে", cost: 120 }], showDeliveryZone: true }
}: {
    initialProduct: Product | null,
    productId: string,
    initialSettings?: any,
    initialShipping?: any
}) {
    const router = useRouter();
    const [product, setProduct] = useState<Product | null>(initialProduct);
    const [loading, setLoading] = useState(!initialProduct);
    const [mainIdx, setMainIdx] = useState(0);
    const [zoomed, setZoomed] = useState(false);
    const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
    const [inWish, setInWish] = useState(false);
    const [features, setFeatures] = useState(initialSettings.features || { productReviews: true, relatedProducts: true });

    // --- Embedded Checkout State ---
    const [draftOrderId, setDraftOrderId] = useState<string | null>(null);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [orderLoading, setOrderLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [couponCode, setCouponCode] = useState("");
    const [couponApplied, setCouponApplied] = useState<{ code: string; discountPercent: number; maxDiscount: number } | null>(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState("");
    const [shippingZone, setShippingZone] = useState(initialShipping.zones?.[0]?.id || "dhaka");
    const [shippingCost, setShippingCost] = useState(initialShipping.zones?.[0]?.cost || 60);
    const [shippingZones, setShippingZones] = useState(initialShipping.zones || [{ id: "dhaka", label: "ঢাকার ভেতরে", cost: 60 }, { id: "outside", label: "ঢাকার বাইরে", cost: 120 }]);
    const [selectedCity, setSelectedCity] = useState("");
    const [showDeliveryZone, setShowDeliveryZone] = useState(initialShipping.showDeliveryZone !== undefined ? initialShipping.showDeliveryZone : true);
    const [quantity, setQuantity] = useState(1);
    const [showStickyBtn, setShowStickyBtn] = useState(true);

    const descriptionSections = useMemo(() => {
        if (!product?.description) return [];
        return parseDescription(product.description);
    }, [product?.description]);

    const bdCities = [
        "ঢাকা", "চট্টগ্রাম", "খুলনা", "রাজশাহী", "সিলেট", "রংপুর", "বরিশাল", "ময়মনসিংহ",
        "কুমিল্লা", "নারায়ণগঞ্জ", "গাজীপুর", "টঙ্গী", "বগুড়া", "কক্সবাজার", "যশোর", "দিনাজপুর",
        "ব্রাহ্মণবাড়িয়া", "সাভার", "টাঙ্গাইল", "নরসিংদী", "সৈয়দপুর", "নবাবগঞ্জ", "কুষ্টিয়া", "ফরিদপুর",
        "নোয়াখালী", "চাঁদপুর", "ফেনী", "পাবনা", "হবিগঞ্জ", "ঝিনাইদহ", "সাতক্ষীরা", "লক্ষ্মীপুর",
        "মৌলভীবাজার", "মানিকগঞ্জ", "কিশোরগঞ্জ", "জামালপুর", "শেরপুর", "নেত্রকোনা", "জয়পুরহাট",
        "নওগাঁ", "নাটোর", "চাঁপাইনবাবগঞ্জ", "সিরাজগঞ্জ", "সুনামগঞ্জ", "পিরোজপুর", "ভোলা",
        "পটুয়াখালী", "বরগুনা", "ঝালকাঠি", "নীলফামারী", "কুড়িগ্রাম", "গাইবান্ধা", "লালমনিরহাট",
        "ঠাকুরগাঁও", "পঞ্চগড়", "বান্দরবান", "রাঙ্গামাটি", "খাগড়াছড়ি", "মাদারীপুর", "গোপালগঞ্জ",
        "রাজবাড়ী", "শরীয়তপুর", "মুন্সীগঞ্জ", "মাগুরা", "মেহেরপুর"
    ];

    // Function to parse video URL for embedding
    const getEmbedUrl = (url: string) => {
        if (!url) return null;
        if (url.includes('youtube.com/watch?v=')) {
            return url.replace('watch?v=', 'embed/');
        }
        if (url.includes('youtu.be/')) {
            return url.replace('youtu.be/', 'www.youtube.com/embed/');
        }
        if (url.includes('vimeo.com/')) {
            return url.replace('vimeo.com/', 'player.vimeo.com/video/');
        }
        return url; // Return as is for direct MP4 links
    };

    // Auto-save draft order
    useEffect(() => {
        if (!product || (!customerName && !customerPhone)) return;

        const timer = setTimeout(async () => {
            try {
                // Determine current total
                const currentSubtotal = (product.price || 0) * quantity;
                let currentDiscount = 0;
                if (couponApplied) {
                    currentDiscount = Math.round(currentSubtotal * couponApplied.discountPercent / 100);
                    if (couponApplied.maxDiscount > 0 && currentDiscount > couponApplied.maxDiscount) {
                        currentDiscount = couponApplied.maxDiscount;
                    }
                }
                const currentTotal = currentSubtotal - currentDiscount;

                const res = await axios.post('/api/orders/draft', {
                    products: [{ productId: product._id, quantity }],
                    customerName,
                    customerPhone,
                    totalAmount: currentTotal,
                    draftOrderId
                });

                if (res.data.orderId && res.data.orderId !== draftOrderId) {
                    setDraftOrderId(res.data.orderId);
                }
            } catch (err) {
                console.error("Failed to save draft order:", err);
            }
        }, 1500); // 1.5 second debounce

        return () => clearTimeout(timer);
    }, [customerName, customerPhone, quantity, product, couponApplied, shippingCost, draftOrderId]);

    useEffect(() => {
        const wl: string[] = JSON.parse(localStorage.getItem("wishlist") || "[]");
        setInWish(wl.includes(productId));

        if (!initialProduct) {
            axios.get(`/api/products/${productId}`).then(r => {
                setProduct(r.data);
                trackViewContent({ id: r.data._id, name: r.data.name, price: r.data.price, category: r.data.category });
            }).catch(() => { }).finally(() => setLoading(false));
        } else {
            trackViewContent({ id: initialProduct._id, name: initialProduct.name, price: initialProduct.price, category: initialProduct.category });
        }
    }, [productId, initialProduct]);

    // Track checkout visibility for sticky mobile button
    useEffect(() => {
        const checkoutElement = document.getElementById('embedded-checkout');
        if (!checkoutElement) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setShowStickyBtn(!entry.isIntersecting);
            },
            {
                root: null,
                threshold: 0.1, // Trigger when 10% of checkout form is visible
            }
        );

        observer.observe(checkoutElement);

        return () => {
            if (checkoutElement) observer.unobserve(checkoutElement);
        };
    }, []);

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
        if (inWish) { localStorage.setItem("wishlist", JSON.stringify(wl.filter(i => i !== productId))); }
        else { wl.push(productId); localStorage.setItem("wishlist", JSON.stringify(wl)); }
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

    // --- Checkout Logic ---
    const subtotal = (product?.price || 0) * quantity;
    let discountAmount = 0;
    if (couponApplied) {
        discountAmount = Math.round(subtotal * couponApplied.discountPercent / 100);
        if (couponApplied.maxDiscount > 0 && discountAmount > couponApplied.maxDiscount) discountAmount = couponApplied.maxDiscount;
    }
    const totalAmount = subtotal - discountAmount;

    const applyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true); setCouponError("");
        try {
            const r = await axios.post(`/api/coupons/validate`, { code: couponCode });
            setCouponApplied(r.data); setCouponError("");
        } catch (err: any) { setCouponError(err.response?.data?.message || "Invalid coupon"); setCouponApplied(null); }
        finally { setCouponLoading(false); }
    };

    const handleOrderSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        if (!customerName || !customerAddress || !selectedCity) {
            setMessage({ type: "error", text: "Please fill all required delivery details." });
            return;
        }

        setOrderLoading(true);
        setMessage(null);

        try {
            await axios.post(`/api/orders`, {
                products: [{ productId: product._id, quantity }],
                totalAmount,
                customerName,
                customerPhone,
                customerAddress: `${selectedCity}, ${customerAddress}`,
                couponCode: couponApplied?.code || null,
                discountAmount: discountAmount || 0,
                paymentMethod: "cod",
                shippingZone,
                shippingCost,
                draftOrderId,
            });

            // Redirect to success page or show success state internally
            trackPurchase(product._id, totalAmount);
            setMessage({ type: "success", text: "🎉 Order Successful! We will contact you shortly." });
            setCustomerName(""); setCustomerPhone(""); setCustomerAddress(""); setDraftOrderId(null);
        } catch (err: any) {
            setMessage({ type: "error", text: err.response?.data?.message || "Failed to place order." });
        } finally {
            setOrderLoading(false);
        }
    };

    const scrollToCheckout = () => {
        document.getElementById('embedded-checkout')?.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
            const nameInput = document.getElementById('customerName') as HTMLInputElement;
            nameInput?.focus();
        }, 600);
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
                {/* ─── BREADCRUMBS ─── */}
                <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-400 mb-6" aria-label="Breadcrumb">
                    <Link href="/" className="hover:text-white transition-colors">Home</Link>
                    <ChevronRight className="w-4 h-4" />
                    {product.category && product.category !== "General" ? (
                        <>
                            <Link href={`/category/${product.category.toLowerCase()}`} className="hover:text-white transition-colors">{product.category}</Link>
                            <ChevronRight className="w-4 h-4" />
                        </>
                    ) : null}
                    <span className="text-white truncate max-w-[200px] sm:max-w-md w-full sm:w-auto" title={product.name}>{product.name}</span>
                </nav>



                {/* ═══ PRODUCT HERO SECTION ═══ */}
                <div className="glass-card p-0 sm:p-6 md:p-10 overflow-hidden" style={{ transform: "none" }}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 sm:gap-6 lg:gap-12">
                        {/* ─── Image Gallery with Zoom, Arrows & Thumbnails ─── */}
                        <div className="space-y-0 sm:space-y-4">
                            {/* Main Image - Full width on mobile */}
                            <div className="relative aspect-square sm:aspect-[4/5] w-full sm:rounded-2xl overflow-hidden bg-slate-800 border-0 sm:border border-slate-700 cursor-zoom-in group"
                                onClick={() => setZoomed(!zoomed)} onMouseMove={handleZoomMove} onMouseLeave={() => setZoomed(false)}>
                                {product.imageUrls?.length > 0 ? (
                                    <Image src={product.imageUrls[mainIdx] || ""} alt={product.name} fill
                                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                                        sizes="(max-width: 1024px) 100vw, 50vw"
                                        priority
                                        style={zoomed ? { transform: "scale(2.5)", transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : {}} />
                                ) : <div className="w-full h-full flex items-center justify-center text-slate-500"><ShoppingBag className="w-16 h-16" /></div>}

                                {/* Wishlist button */}
                                <button onClick={(e) => { e.stopPropagation(); toggleWish(); }}
                                    className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md transition-all z-10 shadow-lg ${inWish ? "bg-pink-500 text-white shadow-pink-500/20" : "bg-slate-900/40 text-white hover:bg-pink-500 border border-white/10"}`}>
                                    <Heart className={`w-5 h-5 ${inWish ? "fill-current" : ""}`} />
                                </button>

                                {/* Zoom hint (desktop only) */}
                                {!zoomed && <div className="absolute bottom-3 right-3 p-2 rounded-full bg-black/40 text-white/60 hidden sm:block"><ZoomIn className="w-4 h-4" /></div>}

                                {/* Prev/Next arrows for multiple images */}
                                {product.imageUrls?.length > 1 && (
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); setMainIdx(mainIdx === 0 ? product.imageUrls.length - 1 : mainIdx - 1); }}
                                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white/80 hover:bg-black/70 backdrop-blur-sm transition-all">
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setMainIdx((mainIdx + 1) % product.imageUrls.length); }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white/80 hover:bg-black/70 backdrop-blur-sm transition-all">
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </>
                                )}

                                {/* Image counter badge */}
                                {product.imageUrls?.length > 1 && (
                                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white/80 text-xs font-medium">
                                        {mainIdx + 1} / {product.imageUrls.length}
                                    </div>
                                )}
                            </div>

                            {/* Thumbnail Row */}
                            {product.imageUrls?.length > 1 && (
                                <div className="px-3 sm:px-0 py-3 sm:py-0 mt-2 sm:mt-4">
                                    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                        {product.imageUrls.map((url, idx) => (
                                            <button key={idx} onClick={() => setMainIdx(idx)}
                                                className={`relative w-[72px] h-[72px] sm:w-20 sm:h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-200 ${mainIdx === idx ? "border-[#8B5CF6] opacity-100 ring-2 ring-[#8B5CF6]/30 shadow-[#8B5CF6]/20" : "border-transparent opacity-60 hover:opacity-100 bg-slate-800"}`}>
                                                <Image src={url || ""} alt={`${product.name} - Image ${idx + 1}`} fill className="object-cover" sizes="96px" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ─── Product Info ─── */}
                        <div className="flex flex-col p-4 sm:p-0">
                            {product.category && product.category !== "General" && (
                                <span className="text-xs text-[#8B5CF6] font-medium tracking-wide uppercase mb-2 block">{product.category}</span>
                            )}
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 text-[#F8FAFC] leading-tight">{product.name}</h1>

                            {/* Reviews Snippet */}
                            <div className="flex items-center gap-2 mb-6 cursor-pointer" onClick={() => document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' })}>
                                <div className="flex text-[#FBBF24]">
                                    <Star className="w-4 h-4 fill-current" />
                                    <Star className="w-4 h-4 fill-current" />
                                    <Star className="w-4 h-4 fill-current" />
                                    <Star className="w-4 h-4 fill-current" />
                                    <Star className="w-4 h-4" />
                                </div>
                                <span className="text-sm text-slate-400 hover:text-white transition-colors">12 Reviews</span>
                            </div>

                            <div className="flex items-center gap-4 mb-8">
                                <span className="text-3xl sm:text-4xl font-bold text-white">৳{product.price.toLocaleString()}</span>
                                {(product.stock || 0) > 0 ? (
                                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#10B981] bg-[#10B981]/10 px-3 py-1 rounded-full border border-[#10B981]/20">
                                        <CheckCircle className="w-4 h-4" />
                                        In Stock
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                                        <AlertCircle className="w-4 h-4" />
                                        Out of Stock
                                    </span>
                                )}
                            </div>

                            {/* ─── Product Options & CTAs ─── */}
                            {product.variants?.length > 0 && (
                                <div className="mb-8">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-medium text-white">Select Variant</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {product.variants.map((v: any, i: number) => (
                                            <button key={i} className="px-5 py-2.5 rounded-md text-sm font-medium transition-all bg-slate-800 border-2 border-transparent text-slate-300 hover:text-white hover:border-slate-600 focus:border-[#8B5CF6] focus:text-white focus:ring-1 focus:ring-[#8B5CF6]">
                                                {v.label} {v.stock > 0 ? "" : "(Out)"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quantity Selector */}
                            <div className="mb-8 items-center gap-4 hidden sm:flex">
                                <h3 className="text-sm font-medium text-white min-w-16">Quantity</h3>
                                <div className="flex items-center gap-4 border border-slate-700 bg-slate-800/50 rounded-lg w-fit p-1">
                                    <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-slate-700"><Minus className="w-4 h-4" /></button>
                                    <span className="w-8 text-center font-semibold text-white">{quantity}</span>
                                    <button type="button" onClick={() => setQuantity(quantity + 1)} className="p-2 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-slate-700"><Plus className="w-4 h-4" /></button>
                                </div>
                            </div>

                            {/* CTAs */}
                            <div className="flex flex-col gap-3 mb-8">
                                {(product.stock || 0) > 0 ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                trackAddToCart({ id: product._id, name: product.name, price: product.price, category: product.category });
                                                // Handle Add to Cart functionality here
                                            }}
                                            className="w-full text-lg py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors border-2 border-[#8B5CF6] text-[#8B5CF6] hover:bg-[#8B5CF6]/10 bg-transparent">
                                            <ShoppingCart className="w-5 h-5" /> Add to Cart
                                        </button>

                                        <button
                                            onClick={() => {
                                                trackAddToCart({ id: product._id, name: product.name, price: product.price, category: product.category });
                                                scrollToCheckout();
                                            }}
                                            className="w-full text-lg py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-[0_4px_14px_0_rgba(139,92,246,0.39)] hover:shadow-[0_6px_20px_rgba(139,92,246,0.23)] hover:-translate-y-0.5">
                                            <Zap className="w-5 h-5 fill-current" /> Buy Now
                                        </button>
                                    </>
                                ) : (
                                    <div className="w-full py-4 text-center bg-slate-800 border-2 border-slate-700 rounded-lg text-slate-400 font-medium">Temporarily Out of Stock</div>
                                )}
                            </div>



                            {/* Dynamic Accordions */}
                            <div className="space-y-3">
                                <details className="group rounded-lg bg-slate-800 overflow-hidden" open>
                                    <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-semibold text-white select-none">
                                        Product Description
                                        <ChevronDown className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" />
                                    </summary>
                                    <div className="px-5 pb-5 text-sm text-slate-300 leading-relaxed border-t border-slate-700 pt-4">
                                        {product.descriptionSections && product.descriptionSections.length > 0 ? (
                                            product.descriptionSections.map((section, idx) => (
                                                <div key={idx} className={idx > 0 ? "mt-4" : ""}>
                                                    {section.title && <strong className="block text-white mb-2">{section.title}</strong>}
                                                    <div className="whitespace-pre-wrap">{section.content}</div>
                                                </div>
                                            ))
                                        ) : descriptionSections.length > 0 ? (
                                            descriptionSections.map((section, idx) => (
                                                <div key={idx} className={idx > 0 ? "mt-4" : ""}>
                                                    {section.title && <strong className="block text-white mb-2">{section.title}</strong>}
                                                    {section.paragraphs.map((p, i) => <p key={i} className="mb-2">{p}</p>)}
                                                    {section.bullets.length > 0 && (
                                                        <ul className="list-disc pl-5 mt-2 space-y-1">
                                                            {section.bullets.map((b, i) => <li key={i}>{b}</li>)}
                                                        </ul>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="whitespace-pre-wrap">{product.description}</p>
                                        )}
                                    </div>
                                </details>

                                <details className="group rounded-lg bg-slate-800 overflow-hidden">
                                    <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-semibold text-white select-none">
                                        Shipping & Delivery Info
                                        <ChevronDown className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" />
                                    </summary>
                                    <div className="px-5 pb-5 text-sm text-slate-300 leading-relaxed border-t border-slate-700 pt-4 space-y-2">
                                        <p><strong>Standard Delivery:</strong> 2-3 business days inside Dhaka, 3-5 days outside.</p>
                                        <p><strong>Cost:</strong> <span className="text-[#10B981]">Free home delivery</span> on all orders.</p>
                                        <p><strong>Payment:</strong> Cash on Delivery (COD) available nationwide.</p>
                                    </div>
                                </details>


                            </div>
                        </div>
                    </div>
                </div>

                {/* Video Showcase */}
                {product.videoUrl && (
                    <div className="mt-8 sm:mt-12 glass-card p-4 sm:p-6 md:p-10" style={{ transform: "none" }}>
                        <h2 className="text-xl sm:text-2xl font-bold mb-6 text-[var(--foreground)] flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-500 flex items-center justify-center">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            </span>
                            Product Showcase
                        </h2>
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/50 border border-[var(--card-border)] shadow-2xl">
                            {(product.videoUrl.includes('youtube') || product.videoUrl.includes('youtu.be') || product.videoUrl.includes('vimeo')) ? (
                                <iframe
                                    src={getEmbedUrl(product.videoUrl) || ""}
                                    className="absolute inset-0 w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            ) : (
                                <video
                                    src={product.videoUrl}
                                    controls
                                    className="absolute inset-0 w-full h-full object-contain"
                                    preload="metadata"
                                >
                                    Your browser does not support the video tag.
                                </video>
                            )}
                        </div>
                    </div>
                )}

                {/* Embedded Checkout Form */}
                <div id="embedded-checkout" className="mt-8 sm:mt-12 glass-card p-4 sm:p-6 md:p-10 scroll-mt-24" style={{ transform: "none" }}>
                    <div className="mb-8 lg:mb-10 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm font-medium text-emerald-300">Secure Checkout 256-bit SSL</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Complete your <span className="gradient-text text-transparent bg-clip-text">Order</span></h2>
                        <p className="text-[var(--text-muted)] mt-2">Almost there! Just a few details to get your items shipped.</p>
                    </div>

                    {message && message.type === "error" && (
                        <div className="flex items-center gap-3 p-4 rounded-2xl mb-8 bg-red-500/10 border border-red-500/20 text-red-300 animate-in fade-in slide-in-from-top-4">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="font-medium">{message.text}</p>
                        </div>
                    )}

                    {/* Success Message UI override */}
                    {message?.type === "success" ? (
                        <div className="bg-[#0f0c1b] border border-emerald-500/30 rounded-3xl p-8 max-w-2xl mx-auto shadow-2xl shadow-emerald-500/10 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 blur-[60px] rounded-full pointer-events-none" />
                            <div className="relative z-10">
                                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30 ring-4 ring-emerald-500/10">
                                    <CheckCircle className="w-10 h-10 text-emerald-400" />
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Order Confirmed!</h2>
                                <p className="text-gray-400 mb-8 text-base leading-relaxed">
                                    Thank you for your purchase. We&apos;ve received your order and will contact you shortly to confirm delivery details.
                                </p>
                                <button
                                    onClick={() => { setMessage(null); window.location.href = "/"; }}
                                    className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                                >Continue Shopping</button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleOrderSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

                            {/* LEFT COLUMN: Contact & Payment */}
                            <div className="lg:col-span-7 space-y-8">
                                {/* Step 1: Contact & Delivery Details */}
                                <section className="p-5 sm:p-6 rounded-2xl bg-black/40 border border-gray-800 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-500"></div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <span className="w-8 h-8 rounded-full bg-violet-500 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-violet-500/30">1</span>
                                        <h3 className="text-lg font-semibold text-white">Contact & Delivery</h3>
                                    </div>

                                    <div className="space-y-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div className="space-y-1.5">
                                                <label htmlFor="customerName" className="text-sm font-medium text-slate-400 ml-1">Full Name</label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input id="customerName" type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" className="w-full bg-slate-800 border border-slate-600 focus:border-transparent focus:ring-2 focus:ring-[#8B5CF6] rounded-md px-4 py-2.5 pl-10 text-white outline-none transition-all placeholder:text-slate-400" required />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label htmlFor="customerPhone" className="text-sm font-medium text-slate-400 ml-1">Phone Number</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input id="customerPhone" type="tel" inputMode="tel" autoComplete="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full bg-slate-800 border border-slate-600 focus:border-transparent focus:ring-2 focus:ring-[#8B5CF6] rounded-md px-4 py-2.5 pl-10 text-white outline-none transition-all placeholder:text-slate-400" required />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label htmlFor="selectedCity" className="text-sm font-medium text-slate-400 ml-1">City / District</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <select id="selectedCity" value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="w-full bg-slate-800 border border-slate-600 focus:border-transparent focus:ring-2 focus:ring-[#8B5CF6] rounded-md px-4 py-2.5 pl-10 text-white outline-none transition-all appearance-none cursor-pointer" required>
                                                    <option value="" disabled>Select your district...</option>
                                                    {bdCities.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label htmlFor="customerAddress" className="text-sm font-medium text-slate-400 ml-1">Detailed Address (House/Road/Area)</label>
                                            <textarea id="customerAddress" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="e.g. House 12, Road 4, Block C" className="w-full bg-slate-800 border border-slate-600 focus:border-transparent focus:ring-2 focus:ring-[#8B5CF6] rounded-md px-4 py-3 text-white outline-none transition-all placeholder:text-slate-400 resize-none" rows={3} required />
                                        </div>

                                        {/* Free Home Delivery Notice */}
                                        <div className="pt-5 border-t border-gray-800">
                                            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-400/40 shadow-sm shadow-emerald-500/5">
                                                <Truck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                                <span className="text-sm font-medium text-emerald-300">📦 Free Home Delivery on all orders!</span>
                                            </div>
                                        </div>


                                    </div>
                                </section>

                                {/* MOBILE ONLY: Unified Order Summary (after form) */}
                                <div className="lg:hidden">
                                    <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-gray-800">
                                        <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-white">
                                            <ShoppingCart className="w-4 h-4 text-emerald-400" />
                                            Order Summary
                                        </h3>

                                        {/* Cart Item */}
                                        <div className="flex gap-3 items-center pb-4 border-b border-gray-800">
                                            <div className="w-14 h-14 rounded-lg bg-gray-800 border border-gray-700 overflow-hidden shrink-0 relative">
                                                {product.imageUrls?.[0] ? (
                                                    <Image src={product.imageUrls[0]} alt={product.name} fill className="object-cover" sizes="56px" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-600"><ShoppingCart className="w-5 h-5" /></div>
                                                )}
                                                <div className="absolute top-0 right-0 w-4 h-4 bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center rounded-bl-lg">
                                                    {quantity}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-white truncate">{product.name}</h4>
                                                <p className="text-xs text-violet-400 font-semibold mt-0.5">৳{(product.price * quantity).toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center gap-1 bg-black/40 border border-gray-700 rounded-md p-1">
                                                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-1.5 hover:text-white text-gray-400 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                                                <span className="text-xs font-medium w-5 text-center">{quantity}</span>
                                                <button type="button" onClick={() => setQuantity(quantity + 1)} className="p-1.5 hover:text-white text-gray-400 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>

                                        {/* Coupon Section */}
                                        <div className="py-4 border-b border-gray-800 relative">
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Discount code" className="w-full bg-slate-800 border border-slate-600 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] rounded-md px-4 py-2.5 pl-9 text-white outline-none transition-all placeholder:text-slate-500 text-sm font-mono" disabled={!!couponApplied} />
                                                </div>
                                                {couponApplied ? (
                                                    <button type="button" onClick={() => { setCouponApplied(null); setCouponCode(""); }} className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-md text-sm font-medium transition-all">Remove</button>
                                                ) : (
                                                    <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()} className="px-4 py-2.5 bg-slate-800 border border-slate-600 text-white hover:bg-slate-700 disabled:opacity-50 rounded-md text-sm font-medium transition-all">
                                                        {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                                                    </button>
                                                )}
                                            </div>
                                            {couponError && <p className="text-xs text-red-400 mt-2">{couponError}</p>}
                                            {couponApplied && <p className="text-xs text-emerald-400 mt-2 font-medium">✅ {couponApplied.discountPercent}% off applied! (-৳{discountAmount.toLocaleString()})</p>}
                                        </div>

                                        {/* Cost Breakdown */}
                                        <div className="space-y-3 pt-4 mb-5">
                                            <div className="flex justify-between text-sm text-gray-400">
                                                <span>Subtotal</span>
                                                <span className="text-white font-medium">৳{subtotal.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-gray-400">
                                                <div className="flex flex-col">
                                                    <span className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-emerald-400" /> Free Home Delivery</span>
                                                    <span className="text-xs text-emerald-400 font-medium mt-0.5">Cash On Delivery Available</span>
                                                </div>
                                                <span className="text-emerald-400 font-medium">FREE</span>
                                            </div>
                                            {discountAmount > 0 && (
                                                <div className="flex justify-between text-sm text-emerald-400 font-medium">
                                                    <span>Discount</span>
                                                    <span>-৳{discountAmount.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="pt-3 mt-3 border-t border-gray-800 flex justify-between items-center">
                                                <span className="text-base font-semibold text-white">Total</span>
                                                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-emerald-400">
                                                    ৳{totalAmount.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Confirm Order Button */}
                                        <button
                                            type="submit"
                                            disabled={orderLoading || (product?.stock || 0) <= 0}
                                            className="w-full relative group overflow-hidden rounded-md disabled:opacity-50 disabled:cursor-not-allowed bg-[#8B5CF6] hover:bg-[#7C3AED] transition-colors"
                                        >
                                            <div className="relative px-6 py-3.5 flex items-center justify-center gap-2 text-white font-medium text-base">
                                                {orderLoading ? (
                                                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                                                ) : (
                                                    <>Confirm Order <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                                                )}
                                            </div>
                                        </button>
                                        <p className="text-center text-xs text-gray-500 mt-3 flex items-center justify-center gap-1">
                                            <ShieldCheck className="w-3.5 h-3.5" /> Payments are 100% secure & encrypted
                                        </p>
                                    </div>
                                </div>

                                {/* Payment Methods Removed */}
                            </div>

                            {/* RIGHT COLUMN: Order Summary */}
                            <div className="hidden lg:block lg:col-span-5 relative">
                                <div className="sticky top-6 space-y-6">
                                    <div className="p-5 sm:p-6 rounded-2xl bg-black/40 border border-gray-800">
                                        <h3 className="text-lg font-semibold mb-5 flex items-center gap-2 text-white">
                                            <ShoppingCart className="w-5 h-5 text-emerald-400" />
                                            Order Summary
                                        </h3>

                                        {/* Cart Item - The product being viewed */}
                                        <div className="flex gap-4 mb-6 pb-6 border-b border-gray-800">
                                            <div className="w-16 h-16 rounded-lg bg-gray-800 border border-gray-700 overflow-hidden shrink-0 relative">
                                                {product.imageUrls?.[0] ? (
                                                    <Image src={product.imageUrls[0]} alt={product.name} fill className="object-cover" sizes="64px" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-600"><ShoppingCart className="w-6 h-6" /></div>
                                                )}
                                                <div className="absolute top-0 right-0 w-5 h-5 bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center rounded-bl-lg">
                                                    {quantity}
                                                </div>
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center min-w-0">
                                                <h4 className="text-sm font-medium text-white truncate">{product.name}</h4>
                                                <p className="text-xs text-violet-400 font-semibold mb-2">৳{(product.price * quantity).toLocaleString()}</p>
                                                <div className="flex items-center gap-1 bg-black/40 border border-gray-700 rounded-md p-1 w-fit">
                                                    <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-1 hover:text-white text-gray-400"><Minus className="w-3 h-3" /></button>
                                                    <span className="text-xs font-medium w-4 text-center">{quantity}</span>
                                                    <button type="button" onClick={() => setQuantity(quantity + 1)} className="p-1 hover:text-white text-gray-400"><Plus className="w-3 h-3" /></button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Coupon Section */}
                                        <div className="mb-5 relative">
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Discount code" className="w-full bg-slate-800 border border-slate-600 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] rounded-md px-4 py-2.5 pl-9 text-white outline-none transition-all placeholder:text-slate-500 text-sm font-mono" disabled={!!couponApplied} />
                                                </div>
                                                {couponApplied ? (
                                                    <button type="button" onClick={() => { setCouponApplied(null); setCouponCode(""); }} className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-md text-sm font-medium transition-all">Remove</button>
                                                ) : (
                                                    <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()} className="px-4 py-2.5 bg-slate-800 border border-slate-600 text-white hover:bg-slate-700 disabled:opacity-50 rounded-md text-sm font-medium transition-all">
                                                        {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                                                    </button>
                                                )}
                                            </div>
                                            {couponError && <p className="text-xs text-red-400 mt-2 absolute -bottom-5 left-1">{couponError}</p>}
                                            {couponApplied && <p className="text-xs text-emerald-400 mt-2 absolute -bottom-5 left-1 font-medium">✅ {couponApplied.discountPercent}% off applied!</p>}
                                        </div>

                                        {/* Cost Breakdown */}
                                        <div className="space-y-3 mb-6">
                                            <div className="flex justify-between text-sm text-gray-400">
                                                <span>Subtotal</span>
                                                <span className="text-white font-medium">৳{subtotal.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-gray-400">
                                                <div className="flex flex-col">
                                                    <span className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-emerald-400" /> Free Home Delivery</span>
                                                    <span className="text-xs text-emerald-400 font-medium mt-0.5">Cash On Delivery Available</span>
                                                </div>
                                                <span className="text-emerald-400 font-medium">FREE</span>
                                            </div>
                                            {discountAmount > 0 && (
                                                <div className="flex justify-between text-sm text-emerald-400 font-medium">
                                                    <span>Discount</span>
                                                    <span>-৳{discountAmount.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="pt-3 mt-3 border-t border-gray-800 flex justify-between items-center">
                                                <span className="text-base font-semibold text-white">Total</span>
                                                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-emerald-400">
                                                    ৳{totalAmount.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={orderLoading || (product?.stock || 0) <= 0}
                                            className="w-full relative group overflow-hidden rounded-md disabled:opacity-50 disabled:cursor-not-allowed bg-[#8B5CF6] hover:bg-[#7C3AED] transition-colors"
                                        >
                                            <div className="relative px-6 py-3.5 flex items-center justify-center gap-2 text-white font-medium text-base">
                                                {orderLoading ? (
                                                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                                                ) : (
                                                    <>Confirm Order <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                                                )}
                                            </div>
                                        </button>
                                        <p className="text-center text-xs text-gray-500 mt-4 flex items-center justify-center gap-1">
                                            <ShieldCheck className="w-3.5 h-3.5" /> Payments are 100% secure & encrypted
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}
                </div>

                {/* Reviews Section */}
                <div id="reviews-section" className="mt-20">
                    {features.productReviews !== false && <ProductReviews productId={product._id} />}
                </div>

                {/* Related Products */}
                <div className="mt-16">
                    {features.relatedProducts !== false && <RelatedProducts currentId={product._id} category={product.category} />}
                </div>
            </div>

            {/* Mobile Sticky Buy Now Bar Removed */}
        </div>
    );
}
