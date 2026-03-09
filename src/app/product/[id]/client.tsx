"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, ShoppingBag, Loader2, Heart, Share2, ZoomIn, Phone, CheckCircle, AlertCircle, ShoppingCart, User, Tag, MapPin, Truck, ShieldCheck, Plus, Minus, ChevronRight, ChevronLeft, Package, Zap, Info } from "lucide-react";
import Image from "next/image";
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
                let currentSubtotal = (product.price || 0) * quantity;
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
                <button onClick={() => router.back()} aria-label="Go back" className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors mb-6 sm:mb-8 group p-2 -ml-2 min-h-[44px]">
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back
                </button>

                {/* ═══ PRODUCT HERO SECTION ═══ */}
                <div className="glass-card p-0 sm:p-6 md:p-10 overflow-hidden" style={{ transform: "none" }}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 sm:gap-6 lg:gap-12">
                        {/* ─── Image Gallery with Zoom, Arrows & Thumbnails ─── */}
                        <div className="space-y-0 sm:space-y-4">
                            {/* Main Image - Full width on mobile */}
                            <div className="relative aspect-square sm:aspect-[3/4] w-full sm:rounded-2xl overflow-hidden bg-[var(--card-bg)] border-0 sm:border border-[var(--card-border)] cursor-zoom-in"
                                onClick={() => setZoomed(!zoomed)} onMouseMove={handleZoomMove} onMouseLeave={() => setZoomed(false)}>
                                {product.imageUrls?.length > 0 ? (
                                    <Image src={product.imageUrls[mainIdx] || ""} alt={product.name} fill
                                        className="object-cover transition-transform duration-300"
                                        sizes="(max-width: 1024px) 100vw, 50vw"
                                        priority
                                        style={zoomed ? { transform: "scale(2.5)", transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : {}} />
                                ) : <div className="w-full h-full flex items-center justify-center text-gray-600"><ShoppingBag className="w-16 h-16" /></div>}

                                {/* Wishlist button */}
                                <div className="absolute top-3 right-3 flex gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); toggleWish(); }} className={`p-2.5 rounded-full backdrop-blur-sm transition-all ${inWish ? "bg-pink-500 text-white" : "bg-black/40 text-white hover:bg-pink-500/80"}`}>
                                        <Heart className={`w-5 h-5 ${inWish ? "fill-current" : ""}`} />
                                    </button>
                                </div>

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

                            {/* Thumbnail Row - Larger, more visible */}
                            {product.imageUrls?.length > 1 && (
                                <div className="px-3 sm:px-0 py-3 sm:py-0">
                                    <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                        {product.imageUrls.map((url, idx) => (
                                            <button key={idx} onClick={() => setMainIdx(idx)}
                                                className={`relative w-[72px] h-[72px] sm:w-20 sm:h-20 md:w-24 md:h-24 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-200 ${mainIdx === idx ? "border-violet-500 ring-2 ring-violet-500/30 scale-105 shadow-lg shadow-violet-500/20" : "border-[var(--card-border)] opacity-60 hover:opacity-100 hover:border-violet-500/50"}`}>
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
                                <span className="text-xs text-violet-500 dark:text-violet-400 font-medium bg-violet-500/10 px-3 py-1 rounded-full w-fit mb-3">{product.category}</span>
                            )}
                            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 gradient-text">{product.name}</h1>

                            <div className="flex items-baseline gap-3 mb-4 sm:mb-6">
                                <span className="text-3xl sm:text-4xl font-bold text-[var(--foreground)]">৳{product.price.toLocaleString()}</span>
                                {(product.stock || 0) > 0 && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        In Stock ({product.stock})
                                    </span>
                                )}
                            </div>

                            {/* ─── Enhanced Description Section ─── */}
                            <div className="border-t border-[var(--card-border)] pt-6 mb-6 sm:mb-8">
                                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                                    <Info className="w-5 h-5 text-violet-400" />
                                    Product Details
                                </h3>

                                {product.descriptionSections && product.descriptionSections.length > 0 ? (
                                    product.descriptionSections.map((section, idx) => (
                                        <div key={idx} className={idx > 0 ? "mt-6 pt-6 border-t border-[var(--card-border)]/50" : ""}>
                                            {section.title && (
                                                <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                                                    {idx === 0 ? <Zap className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-violet-400" />}
                                                    {section.title}
                                                </h4>
                                            )}
                                            <div className="text-[var(--text-muted)] leading-relaxed text-sm sm:text-base whitespace-pre-wrap">
                                                {section.content}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <>
                                        {descriptionSections.map((section, idx) => (
                                            <div key={idx} className={idx > 0 ? "mt-6 pt-6 border-t border-[var(--card-border)]/50" : ""}>
                                                {section.title && (
                                                    <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                                                        {idx === 0 ? <Zap className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-violet-400" />}
                                                        {section.title}
                                                    </h4>
                                                )}

                                                {section.paragraphs.length > 0 && (
                                                    <div className="text-[var(--text-muted)] leading-relaxed text-sm sm:text-base space-y-2">
                                                        {section.paragraphs.map((p, i) => (
                                                            <p key={i}>{p}</p>
                                                        ))}
                                                    </div>
                                                )}

                                                {section.bullets.length > 0 && (
                                                    <ul className="space-y-2 mt-3">
                                                        {section.bullets.map((b, i) => (
                                                            <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-muted)]">
                                                                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                                                <span>{b}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}

                                        {descriptionSections.length === 0 && product.description && (
                                            <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base text-[var(--text-muted)]">{product.description}</p>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Trust Badges Removed */}

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

                            {/* CTA Button - "Buy Now" anchors to checkout */}
                            <div className="mt-auto">
                                {(product.stock || 0) > 0 ? (
                                    <button
                                        onClick={() => {
                                            trackAddToCart({ id: product._id, name: product.name, price: product.price, category: product.category });
                                            scrollToCheckout();
                                        }}
                                        className="w-full btn-primary text-base sm:text-lg py-3.5 sm:py-4 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
                                        <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" /> Buy Now — ৳{product.price.toLocaleString()}
                                    </button>
                                ) : <div className="w-full py-4 text-center bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl text-[var(--text-muted)] font-medium">Out of Stock</div>}
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
                                    Thank you for your purchase. We've received your order and will contact you shortly to confirm delivery details.
                                </p>
                                <button
                                    onClick={() => { setMessage(null); window.location.href = "/"; }}
                                    className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                                >Continue Shopping</button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleOrderSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                            {/* MOBILE: Order Summary appears FIRST (before the form) */}
                            <div className="lg:hidden">
                                <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-gray-800 mb-2">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-base font-semibold flex items-center gap-2 text-white">
                                            <ShoppingCart className="w-4 h-4 text-emerald-400" />
                                            Order Summary
                                        </h3>
                                        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-emerald-400">
                                            ৳{totalAmount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex gap-3 items-center">
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
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-400">৳{subtotal.toLocaleString()}</span>
                                                <span className="text-xs text-gray-600">+</span>
                                                <span className="text-xs text-emerald-400">Free Delivery (COD)</span>
                                                {discountAmount > 0 && (
                                                    <>
                                                        <span className="text-xs text-gray-600">-</span>
                                                        <span className="text-xs text-emerald-400">৳{discountAmount}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 bg-black/40 border border-gray-700 rounded-md p-1">
                                            <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-1 hover:text-white text-gray-400"><Minus className="w-3 h-3" /></button>
                                            <span className="text-xs font-medium w-4 text-center">{quantity}</span>
                                            <button type="button" onClick={() => setQuantity(quantity + 1)} className="p-1 hover:text-white text-gray-400"><Plus className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

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
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label htmlFor="customerName" className="text-sm font-medium text-[var(--text-muted)] ml-1">Full Name</label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                    <input id="customerName" type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 pl-10 text-[var(--input-text)] outline-none transition-all" required />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label htmlFor="customerPhone" className="text-sm font-medium text-[var(--text-muted)] ml-1">Phone Number</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                    <input id="customerPhone" type="tel" inputMode="tel" autoComplete="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 pl-10 text-[var(--input-text)] outline-none transition-all" required />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label htmlFor="selectedCity" className="text-sm font-medium text-[var(--text-muted)] ml-1">City / District</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                <select id="selectedCity" value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 pl-10 text-[var(--input-text)] outline-none transition-all appearance-none cursor-pointer" required>
                                                    <option value="" disabled>Select your district...</option>
                                                    {bdCities.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none rotate-90" />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label htmlFor="customerAddress" className="text-sm font-medium text-[var(--text-muted)] ml-1">Detailed Address</label>
                                            <textarea id="customerAddress" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="House 12, Road 4, Area" className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 text-[var(--input-text)] outline-none transition-all resize-none" rows={2} required />
                                        </div>


                                    </div>
                                </section>

                                {/* Payment Methods Removed */}
                            </div>

                            {/* RIGHT COLUMN: Order Summary */}
                            <div className="lg:col-span-5 relative">
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
                                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                    <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Discount code" className="w-full bg-black/40 border border-gray-700 focus:border-violet-500 rounded-xl px-4 py-2.5 pl-9 text-white outline-none text-sm font-mono" disabled={!!couponApplied} />
                                                </div>
                                                {couponApplied ? (
                                                    <button type="button" onClick={() => { setCouponApplied(null); setCouponCode(""); }} className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium transition-all">Remove</button>
                                                ) : (
                                                    <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()} className="px-4 py-2.5 bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-all">
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
                                            className="w-full relative group overflow-hidden rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-300 group-hover:scale-[1.02]"></div>
                                            <div className="relative px-6 py-4 flex items-center justify-center gap-2 text-white font-bold text-lg">
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
                {features.productReviews !== false && <ProductReviews productId={product._id} />}

                {/* Related Products */}
                {features.relatedProducts !== false && <RelatedProducts currentId={product._id} category={product.category} />}
            </div>

            {/* Mobile Sticky Buy Now Bar Refined: Button only on right */}
            {(product.stock || 0) > 0 && showStickyBtn && (
                <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden animate-in slide-in-from-bottom-5 pointer-events-none">
                    <div className="flex items-center justify-end gap-3 px-4 py-3 pointer-events-auto">
                        <button
                            onClick={() => {
                                trackAddToCart({ id: product._id, name: product.name, price: product.price, category: product.category });
                                scrollToCheckout();
                            }}
                            className="flex-shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-base px-6 py-3 rounded-xl shadow-lg shadow-violet-500/30 flex items-center gap-2 transition-all active:scale-95">
                            <ShoppingBag className="w-5 h-5" /> Buy Now
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
