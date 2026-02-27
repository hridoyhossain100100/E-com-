"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import { CreditCard, Phone, Hash, CheckCircle, AlertCircle, Loader2, ShoppingCart, User, Tag, MapPin, Truck, Banknote, ShieldCheck, Plus, Minus, Trash2, ChevronRight } from "lucide-react";
import { trackInitiateCheckout, trackPurchase } from "@/lib/pixel";

interface Product {
    _id: string;
    name: string;
    price: number;
    description: string;
    imageUrl: string;
}

function CheckoutForm() {
    const searchParams = useSearchParams();
    const preSelectedProductId = searchParams.get("product");
    const preSelectedName = searchParams.get("name");
    const preSelectedPrice = searchParams.get("price");
    const preSelectedImage = searchParams.get("image");

    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<
        { productId: string; name: string; price: number; quantity: number; imageUrl: string }[]
    >([]);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [bkashNumber, setBkashNumber] = useState("");
    const [transactionId, setTransactionId] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [couponCode, setCouponCode] = useState("");
    const [couponApplied, setCouponApplied] = useState<{ code: string; discountPercent: number; maxDiscount: number } | null>(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("bkash");
    const [shippingZone, setShippingZone] = useState("dhaka");
    const [shippingCost, setShippingCost] = useState(60);
    const [shippingZones, setShippingZones] = useState([{ id: "dhaka", label: "ঢাকার ভেতরে", cost: 60 }, { id: "outside", label: "ঢাকার বাইরে", cost: 120 }]);
    const [selectedCity, setSelectedCity] = useState("");
    const [orderType, setOrderType] = useState<"cod" | "pay">("cod");
    const [showDeliveryZone, setShowDeliveryZone] = useState(true);

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

    useEffect(() => {
        fetchProducts();
        axios.get(`/api/shipping`).then(r => {
            if (r.data.zones?.length) {
                setShippingZones(r.data.zones);
                setShippingZone(r.data.zones[0].id);
                setShippingCost(r.data.zones[0].cost);
            }
            if (r.data.showDeliveryZone !== undefined) setShowDeliveryZone(r.data.showDeliveryZone);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        if (preSelectedProductId && preSelectedName && preSelectedPrice) {
            setSelectedProducts([
                {
                    productId: preSelectedProductId,
                    name: preSelectedName,
                    price: parseFloat(preSelectedPrice),
                    quantity: 1,
                    imageUrl: preSelectedImage || ""
                },
            ]);
        }
    }, [preSelectedProductId, preSelectedName, preSelectedPrice, preSelectedImage]);

    // Track InitiateCheckout when products are populated
    useEffect(() => {
        if (selectedProducts.length > 0) {
            const subtotal = selectedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);
            const numItems = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);
            trackInitiateCheckout(subtotal, numItems);
        }
    }, [selectedProducts.length]);

    const fetchProducts = async () => {
        try {
            const res = await axios.get(`/api/products`);
            setProducts(res.data);
        } catch (err) { }
    };

    const addProduct = (product: Product) => {
        const existing = selectedProducts.find((p) => p.productId === product._id);
        if (existing) {
            setSelectedProducts(
                selectedProducts.map((p) =>
                    p.productId === product._id ? { ...p, quantity: p.quantity + 1 } : p
                )
            );
        } else {
            setSelectedProducts([
                ...selectedProducts,
                { productId: product._id, name: product.name, price: product.price, quantity: 1, imageUrl: product.imageUrl },
            ]);
        }
    };

    const removeProduct = (productId: string) => {
        setSelectedProducts(selectedProducts.filter((p) => p.productId !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setSelectedProducts(
            selectedProducts.map((p) => {
                if (p.productId === productId) {
                    const newQuantity = Math.max(1, p.quantity + delta);
                    return { ...p, quantity: newQuantity };
                }
                return p;
            })
        );
    };

    const subtotal = selectedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);
    let discountAmount = 0;
    if (couponApplied) {
        discountAmount = Math.round(subtotal * couponApplied.discountPercent / 100);
        if (couponApplied.maxDiscount > 0 && discountAmount > couponApplied.maxDiscount) discountAmount = couponApplied.maxDiscount;
    }
    const totalAmount = subtotal - discountAmount + shippingCost;

    const applyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true); setCouponError("");
        try {
            const r = await axios.post(`/api/coupons/validate`, { code: couponCode });
            setCouponApplied(r.data); setCouponError("");
        } catch (err: any) { setCouponError(err.response?.data?.message || "Invalid coupon"); setCouponApplied(null); }
        finally { setCouponLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedProducts.length === 0) {
            setMessage({ type: "error", text: "Please add at least one product." });
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        if (!customerName || !customerAddress || !selectedCity) {
            setMessage({ type: "error", text: "Please fill all required delivery details." });
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        if (orderType === "pay" && (!bkashNumber || !transactionId)) {
            setMessage({ type: "error", text: "Please provide payment details." });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const res = await axios.post(`/api/orders`, {
                products: selectedProducts.map(p => ({ productId: p.productId, quantity: p.quantity })),
                totalAmount,
                customerName,
                customerPhone,
                customerAddress: `${selectedCity}, ${customerAddress}`,
                bkashNumber: orderType === "pay" ? bkashNumber : "",
                transactionId: orderType === "pay" ? transactionId : "",
                couponCode: couponApplied?.code || null,
                discountAmount: discountAmount || 0,
                paymentMethod: orderType === "cod" ? "cod" : paymentMethod,
                shippingZone,
                shippingCost,
            });

            // Fire Meta Pixel Purchase event
            trackPurchase(res.data.order._id || 'UNKNOWN_ORDER', totalAmount);

            setMessage({ type: "success", text: "🎉 Order Successful! We will contact you shortly." });
            setSelectedProducts([]);
            setCustomerName("");
            setCustomerPhone("");
            setCustomerAddress("");
            setBkashNumber("");
            setTransactionId("");
        } catch (err: any) {
            setMessage({ type: "error", text: err.response?.data?.message || "Failed to place order." });
        } finally {
            setLoading(false);
        }
    };

    // Products not in cart
    const availableProducts = products.filter(p => !selectedProducts.some(sp => sp.productId === p._id)).slice(0, 4);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">

            {/* Minimal Header */}
            <div className="mb-8 lg:mb-12 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-300">Secure Checkout 256-bit SSL</span>
                </div>
                <h1 className="text-3xl lg:text-5xl font-bold text-white tracking-tight">Complete your <span className="gradient-text text-transparent bg-clip-text">Order</span></h1>
                <p className="text-[var(--text-muted)] mt-3">Almost there! Just a few details to get your items shipped.</p>
            </div>

            {message && message.type === "error" && (
                <div className="flex items-center gap-3 p-4 rounded-2xl mb-8 bg-red-500/10 border border-red-500/20 text-red-300 animate-in fade-in slide-in-from-top-4">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="font-medium">{message.text}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start opacity-100 transition-opacity duration-300">

                {/* LEFT COLUMN: Numbered Checkout Steps */}
                <div className="lg:col-span-7 space-y-8">

                    {/* Step 1: Contact & Delivery Details (merged) */}
                    <section className="glass-card p-6 lg:p-8 relative overflow-hidden" style={{ transform: "none" }}>
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-500"></div>
                        <div className="flex items-center gap-4 mb-6">
                            <span className="w-8 h-8 rounded-full bg-violet-500 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-violet-500/30">1</span>
                            <h2 className="text-xl font-semibold text-white">Contact & Delivery</h2>
                        </div>

                        <div className="space-y-6">
                            {/* Name & Phone */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-400 ml-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" className="w-full bg-black/40 border border-gray-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 pl-10 text-white outline-none transition-all placeholder:text-gray-600" required />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-400 ml-1">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full bg-black/40 border border-gray-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 pl-10 text-white outline-none transition-all placeholder:text-gray-600" required />
                                    </div>
                                </div>
                            </div>

                            {/* City / District */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-400 ml-1">City / District</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="w-full bg-black/40 border border-gray-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 pl-10 text-white outline-none transition-all appearance-none cursor-pointer" required>
                                        <option value="" disabled>Select your district...</option>
                                        {bdCities.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none rotate-90" />
                                </div>
                            </div>

                            {/* Address */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-400 ml-1">Detailed Address (House/Road/Area)</label>
                                <textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="e.g. House 12, Road 4, Block C, Banani" className="w-full bg-black/40 border border-gray-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 text-white outline-none transition-all placeholder:text-gray-600 resize-none" rows={3} required />
                            </div>

                            {/* Delivery Zone - at bottom, conditionally rendered */}
                            {showDeliveryZone && shippingZones.length > 0 && (
                                <div className="pt-5 border-t border-gray-800 space-y-3">
                                    <label className="text-sm font-medium text-gray-400 ml-1 flex items-center gap-2"><Truck className="w-4 h-4 text-sky-400" /> Select Delivery Zone</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {shippingZones.map(z => (
                                            <button key={z.id} type="button" onClick={() => { setShippingZone(z.id); setShippingCost(z.cost); }}
                                                className={`relative flex items-center justify-between p-4 rounded-xl border transition-all overflow-hidden ${shippingZone === z.id ? "border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/50" : "border-gray-800 bg-black/40 hover:border-gray-600"}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${shippingZone === z.id ? "border-sky-500" : "border-gray-600"}`}>
                                                        {shippingZone === z.id && <div className="w-2 h-2 bg-sky-500 rounded-full"></div>}
                                                    </div>
                                                    <span className={`font-medium ${shippingZone === z.id ? "text-white" : "text-gray-400"}`}>{z.label}</span>
                                                </div>
                                                <span className="text-sky-400 font-semibold bg-sky-500/10 px-2 py-1 rounded-md">৳{z.cost}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Step 2: Payment Method */}
                    <section className="glass-card p-6 lg:p-8 relative overflow-hidden" style={{ transform: "none" }}>
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-pink-500"></div>
                        <div className="flex items-center gap-4 mb-6">
                            <span className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-pink-500/30">2</span>
                            <h2 className="text-xl font-semibold text-white">Payment Method</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <button type="button" onClick={() => setOrderType("cod")}
                                className={`flex flex-col items-start p-5 rounded-xl border transition-all text-left ${orderType === "cod" ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/50" : "border-gray-800 bg-black/40 hover:border-gray-600"}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`p-2 rounded-lg ${orderType === "cod" ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-800 text-gray-400"}`}>
                                        <Truck className="w-5 h-5" />
                                    </div>
                                    <span className={`font-semibold text-lg ${orderType === "cod" ? "text-emerald-400" : "text-gray-300"}`}>Cash on Delivery</span>
                                </div>
                                <span className="text-sm text-gray-500 mt-1">Pay with cash upon receiving your order.</span>
                            </button>

                            <button type="button" onClick={() => setOrderType("pay")}
                                className={`flex flex-col items-start p-5 rounded-xl border transition-all text-left ${orderType === "pay" ? "border-pink-500 bg-pink-500/10 ring-1 ring-pink-500/50" : "border-gray-800 bg-black/40 hover:border-gray-600"}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`p-2 rounded-lg ${orderType === "pay" ? "bg-pink-500/20 text-pink-400" : "bg-gray-800 text-gray-400"}`}>
                                        <CreditCard className="w-5 h-5" />
                                    </div>
                                    <span className={`font-semibold text-lg ${orderType === "pay" ? "text-pink-400" : "text-gray-300"}`}>Digital Payment</span>
                                </div>
                                <span className="text-sm text-gray-500 mt-1">Pay instantly via mobile banking securely.</span>
                            </button>
                        </div>

                        {orderType === "pay" && (
                            <div className="p-5 rounded-xl bg-black/40 border border-gray-800 space-y-5 animate-in fade-in slide-in-from-top-2">
                                <div className="flex gap-2">
                                    {[{ id: "bkash", label: "Bkash", color: "text-pink-500 border-pink-500/50 bg-pink-500/10 ring-1 ring-pink-500/50" }, { id: "nagad", label: "Nagad", color: "text-orange-500 border-orange-500/50 bg-orange-500/10 ring-1 ring-orange-500/50" }, { id: "rocket", label: "Rocket", color: "text-purple-500 border-purple-500/50 bg-purple-500/10 ring-1 ring-purple-500/50" }].map(m => (
                                        <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id)}
                                            className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${paymentMethod === m.id ? m.color : "border-gray-800 text-gray-500 bg-transparent hover:border-gray-600"}`}>
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-400 ml-1">{paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} Sender Number</label>
                                        <input type="tel" value={bkashNumber} onChange={(e) => setBkashNumber(e.target.value)} placeholder="01XXXXXXXXX" className="w-full bg-black/60 border border-gray-700 focus:border-pink-500 rounded-xl px-4 py-3 text-white outline-none transition-all placeholder:text-gray-600" required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-400 ml-1">Transaction ID</label>
                                        <input type="text" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="TRXXXXXX" className="w-full bg-black/60 border border-gray-700 focus:border-pink-500 rounded-xl px-4 py-3 text-white outline-none transition-all placeholder:text-gray-600" required />
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {/* RIGHT COLUMN: Sticky Order Summary & Quick Add */}
                <div className="lg:col-span-5 relative">
                    <div className="sticky top-6 space-y-6">

                        {/* Summary Card */}
                        <div className="glass-card p-6" style={{ transform: "none" }}>
                            <h2 className="text-xl font-semibold mb-5 flex items-center gap-2 text-white">
                                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                                Order Summary
                            </h2>

                            {/* Cart Items */}
                            <div className="space-y-4 mb-6 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {selectedProducts.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 italic">
                                        Your cart is empty. Add products below!
                                    </div>
                                ) : (
                                    selectedProducts.map((p) => (
                                        <div key={p.productId} className="flex gap-4 group">
                                            <div className="w-16 h-16 rounded-lg bg-gray-800 border border-gray-700 overflow-hidden flex-shrink-0 relative">
                                                {p.imageUrl ? (
                                                    <Image src={p.imageUrl} alt={p.name} fill className="object-cover" sizes="64px" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-600"><ShoppingCart className="w-6 h-6" /></div>
                                                )}
                                                <div className="absolute top-0 right-0 w-5 h-5 bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center rounded-bl-lg">
                                                    {p.quantity}
                                                </div>
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center min-w-0">
                                                <h3 className="text-sm font-medium text-white truncate">{p.name}</h3>
                                                <p className="text-xs text-violet-400 font-semibold mb-2">৳{(p.price * p.quantity).toLocaleString()}</p>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1 bg-black/40 border border-gray-800 rounded-md p-1 w-fit">
                                                        <button type="button" onClick={() => updateQuantity(p.productId, -1)} className="p-1 hover:text-white text-gray-400 transition-colors"><Minus className="w-3 h-3" /></button>
                                                        <span className="text-xs font-medium w-4 text-center">{p.quantity}</span>
                                                        <button type="button" onClick={() => updateQuantity(p.productId, 1)} className="p-1 hover:text-white text-gray-400 transition-colors"><Plus className="w-3 h-3" /></button>
                                                    </div>
                                                    <button type="button" onClick={() => removeProduct(p.productId)} className="text-gray-500 hover:text-red-400 p-1.5 rounded-md hover:bg-red-500/10 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Coupon Section */}
                            <div className="pt-5 border-t border-gray-800 mb-5 relative">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Gift card or discount code" className="w-full bg-black/40 border border-gray-800 focus:border-violet-500 rounded-xl px-4 py-2.5 pl-9 text-white outline-none transition-all placeholder:text-gray-600 text-sm font-mono" disabled={!!couponApplied} />
                                    </div>
                                    {couponApplied ? (
                                        <button type="button" onClick={() => { setCouponApplied(null); setCouponCode(""); }} className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl text-sm font-medium transition-all">Remove</button>
                                    ) : (
                                        <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()} className="px-4 py-2.5 bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-all">
                                            {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                                        </button>
                                    )}
                                </div>
                                {couponError && <p className="text-xs text-red-400 mt-2 absolute -bottom-5 left-1">{couponError}</p>}
                                {couponApplied && <p className="text-xs text-emerald-400 mt-2 absolute -bottom-5 left-1 font-medium">✅ {couponApplied.discountPercent}% off applied! (-৳{discountAmount.toLocaleString()})</p>}
                            </div>

                            {/* Cost Breakdown */}
                            <div className="pt-6 space-y-3 mb-6">
                                <div className="flex justify-between text-sm text-gray-400">
                                    <span>Subtotal</span>
                                    <span className="text-white font-medium">৳{subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-400">
                                    <span>Shipping <span className="text-xs ml-1">({shippingZones.find(z => z.id === shippingZone)?.label})</span></span>
                                    <span className="text-white font-medium">৳{shippingCost.toLocaleString()}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-emerald-400 font-medium">
                                        <span>Discount</span>
                                        <span>-৳{discountAmount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="pt-3 mt-3 border-t border-gray-800 flex justify-between items-center">
                                    <span className="text-base font-semibold text-white">Total</span>
                                    <div className="text-right">
                                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-emerald-400">
                                            ৳{totalAmount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || selectedProducts.length === 0}
                                className="w-full relative group overflow-hidden rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-300 group-hover:scale-[1.02]"></div>
                                <div className="relative px-6 py-4 flex items-center justify-center gap-2 text-white font-bold text-lg">
                                    {loading ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                                    ) : (
                                        <>Complete Purchase <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                                    )}
                                </div>
                            </button>
                            <p className="text-center text-xs text-gray-500 mt-4 flex items-center justify-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" /> Payments are 100% secure & encrypted
                            </p>
                        </div>

                        {/* Quick Add / Upsell */}
                        {availableProducts.length > 0 && (
                            <div className="glass-card p-5 border-dashed border-violet-500/30" style={{ transform: "none" }}>
                                <h3 className="text-sm font-medium text-violet-300 mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> Frequently Bought Together</h3>
                                <div className="space-y-3">
                                    {availableProducts.map(p => (
                                        <div key={p._id} className="flex items-center justify-between p-2 rounded-lg bg-black/30 hover:bg-black/50 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0 pr-2">
                                                {p.imageUrl && <Image src={p.imageUrl} width={40} height={40} className="rounded border border-gray-800 object-cover flex-shrink-0" alt="" />}
                                                <div className="min-w-0">
                                                    <h4 className="text-xs font-medium text-gray-200 truncate">{p.name}</h4>
                                                    <p className="text-xs text-gray-500 font-semibold">৳{p.price.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => addProduct(p)} className="flex-shrink-0 px-3 py-1.5 bg-violet-600/20 text-violet-400 hover:bg-violet-600 hover:text-white rounded-md text-xs font-bold transition-all">
                                                Add
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </form>

            {/* Success Modal */}
            {message?.type === "success" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#0f0c1b] border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-emerald-500/10 transform animate-in zoom-in-95 duration-300 text-center relative overflow-hidden">
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
                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                            >
                                Continue Shopping
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center mt-20">
                <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
            </div>
        }>
            <CheckoutForm />
        </Suspense>
    );
}
