"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import {
    Upload, Package, Trash2, CheckCircle, AlertCircle, ImagePlus, Loader2,
    Lock, LogOut, BarChart3, ShoppingCart, Search, Edit3, X, Copy,
    DollarSign, TrendingUp, Box, ChevronDown, Download, Tag, Bell,
    ChevronLeft, ChevronRight, ArrowUpDown, Plus, GripVertical, Printer, Settings, Star, Users,
    Send, Truck, MapPin, PackageCheck, RefreshCw
} from "lucide-react";
import Image from "next/image";
import { sendOrderToPathao } from '@/app/actions/pathaoIntegration';
import type { DeliveryDetails } from '@/app/actions/pathaoIntegration';

// Types
interface Variant { _id?: string; label: string; size: string; color: string; stock: number; priceAdjust: number; }
interface Product { _id: string; name: string; price: number; description: string; imageUrls: string[]; category: string; stock: number; variants: Variant[]; createdAt?: string; }
interface OrderProduct { productId: string; name: string; price: number; quantity: number; }
interface Order { _id: string; orderNumber: number; products: OrderProduct[]; totalAmount: number; customerName: string; customerPhone: string; customerAddress: string; bkashNumber: string; transactionId: string; status: string; createdAt: string; couponCode?: string; discountAmount?: number; paymentMethod?: string; consignmentId?: string; pathaoStatus?: string; }
interface Stats { totalOrders: number; totalRevenue: number; totalProducts: number; }
interface DailyData { date: string; label: string; revenue: number; count: number; }
interface Coupon { _id: string; code: string; discountPercent: number; maxDiscount: number; usageLimit: number; usedCount: number; expiresAt: string | null; isActive: boolean; }

axios.defaults.withCredentials = true;

type TabType = "overview" | "products" | "orders" | "coupons" | "settings" | "reviews" | "oms";

// ─── Pathao Timeline Steps ───
const TIMELINE_STEPS = [
    { key: 'Pickup_Pending', label: 'Accepted', icon: CheckCircle },
    { key: 'Picked', label: 'Picked', icon: PackageCheck },
    { key: 'In_Transit', label: 'In Transit', icon: Truck },
    { key: 'Out_For_Delivery', label: 'Out for Delivery', icon: MapPin },
    { key: 'Delivered', label: 'Delivered', icon: Package },
];
function getTimelineIndex(pathaoStatus?: string): number {
    if (!pathaoStatus) return 0;
    const idx = TIMELINE_STEPS.findIndex(s => s.key === pathaoStatus);
    return idx >= 0 ? idx : 0;
}
const STATUS_COLORS: Record<string, string> = {
    pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    confirmed: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    shipped: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    delivered: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
};

// ─── Mini Chart Component (SVG) ───
function RevenueChart({ data }: { data: DailyData[] }) {
    if (!data.length) return null;
    const max = Math.max(...data.map(d => d.revenue), 1);
    const w = 700, h = 200, pad = 30;
    const barW = (w - pad * 2) / data.length - 4;
    return (
        <div className="glass-card p-6 border border-white/5" style={{ transform: "none" }}>
            <h3 className="text-sm font-medium text-gray-400 mb-4">Revenue — Last 14 Days</h3>
            <svg viewBox={`0 0 ${w} ${h + 30}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                {data.map((d, i) => {
                    const barH = (d.revenue / max) * (h - pad);
                    const x = pad + i * ((w - pad * 2) / data.length) + 2;
                    const y = h - barH;
                    return (
                        <g key={i}>
                            <rect x={x} y={y} width={barW} height={barH} rx={4} fill="url(#barGrad)" opacity={0.85} />
                            <text x={x + barW / 2} y={h + 16} textAnchor="middle" className="fill-gray-500" fontSize="9">{d.label}</text>
                            {d.revenue > 0 && <text x={x + barW / 2} y={y - 4} textAnchor="middle" className="fill-gray-300" fontSize="9">৳{(d.revenue / 1000).toFixed(1)}k</text>}
                        </g>
                    );
                })}
                <defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#6d28d9" /></linearGradient></defs>
            </svg>
        </div>
    );
}

export default function AdminPage() {
    // Auth
    const [isAuth, setIsAuth] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [pw, setPw] = useState("");
    const [authErr, setAuthErr] = useState("");
    const [loading, setLoading] = useState(false);

    // Tab & Toast
    const [tab, setTab] = useState<TabType>("overview");
    const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Data
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<Stats>({ totalOrders: 0, totalRevenue: 0, totalProducts: 0 });
    const [chartData, setChartData] = useState<DailyData[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);

    // Products form
    const [pName, setPName] = useState(""); const [pPrice, setPPrice] = useState(""); const [pDesc, setPDesc] = useState("");
    const [pCat, setPCat] = useState("General"); const [pStock, setPStock] = useState(""); const [pImages, setPImages] = useState<File[]>([]);
    const [pPreviews, setPPreviews] = useState<string[]>([]); const [pVariants, setPVariants] = useState<Variant[]>([]);
    const [pMsg, setPMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    // Product sort/search/pagination/bulk
    const [pSearch, setPSearch] = useState(""); const [pSort, setPSort] = useState("date-desc");
    const [pPage, setPPage] = useState(1); const PER_PAGE = 12;
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Edit modal
    const [editP, setEditP] = useState<Product | null>(null);
    const [eName, setEName] = useState(""); const [ePrice, setEPrice] = useState(""); const [eDesc, setEDesc] = useState("");
    const [eCat, setECat] = useState(""); const [eStock, setEStock] = useState(""); const [eVariants, setEVariants] = useState<Variant[]>([]);
    const [eImages, setEImages] = useState<string[]>([]); const editFileRef = useRef<HTMLInputElement>(null);

    // Orders search/filter/pagination
    const [oSearch, setOSearch] = useState(""); const [oStatus, setOStatus] = useState("all");
    const [oPage, setOPage] = useState(1); const [oTotal, setOTotal] = useState(0); const [oPages, setOPages] = useState(1);

    // Coupons form
    const [cCode, setCCode] = useState(""); const [cDisc, setCDisc] = useState(""); const [cMax, setCMax] = useState("");
    const [cLimit, setCLimit] = useState(""); const [cExpiry, setCExpiry] = useState("");

    // Notifications
    const [newOrderCount, setNewOrderCount] = useState(0);

    // OMS State
    const [omsOrders, setOmsOrders] = useState<any[]>([]);
    const [omsLoading, setOmsLoading] = useState(false);
    const [omsProcessingId, setOmsProcessingId] = useState<string | null>(null);
    const [omsModalOrder, setOmsModalOrder] = useState<any | null>(null);
    const [omsModalData, setOmsModalData] = useState<DeliveryDetails>({ itemWeight: 0.5, deliveryType: 48, specialInstruction: '', itemDescription: '', amountToCollect: 0, itemQuantity: 1 });
    const [omsExpandedId, setOmsExpandedId] = useState<string | null>(null);
    const lastOrderCount = useRef(0);

    // Settings
    interface ShippingZone { id: string; label: string; cost: number; }
    const [sZones, setSZones] = useState<ShippingZone[]>([{ id: 'dhaka', label: 'Inside Dhaka', cost: 60 }, { id: 'outside', label: 'Outside Dhaka', cost: 120 }, { id: 'remote', label: 'Remote Area', cost: 180 }]);
    const [sCategories, setSCategories] = useState<string[]>(['General']);
    const [sBanner, setSBanner] = useState({ text: '', enabled: false });
    const [sMarquee, setSMarquee] = useState({ text: '', enabled: false, speed: 12, bgColor: 'gradient' });
    const [sMarketing, setSMarketing] = useState({ pixelId: '', gtmId: '', ga4Id: '' });
    const [sNewCat, setSNewCat] = useState('');
    const [sLoading, setSLoading] = useState(false);
    const [sShowDeliveryZone, setSShowDeliveryZone] = useState(true);
    const [sFeatures, setSFeatures] = useState({ trackOrder: true, productReviews: true, relatedProducts: true });

    // Live visitor counter
    const [liveVisitors, setLiveVisitors] = useState(0);

    useEffect(() => { checkAuth(); }, []);
    useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

    useEffect(() => {
        if (!isAuth) return;

        const fetchVisitorCount = async () => {
            try {
                const r = await axios.get(`/api/visitors/count?t=${Date.now()}`);
                setLiveVisitors(r.data.count);
            } catch (err) { }
        };

        fetchVisitorCount();
        const interval = setInterval(fetchVisitorCount, 30000); // Poll every 30s

        return () => clearInterval(interval);
    }, [isAuth]);

    const checkAuth = async () => {
        try { await axios.get(`/api/admin/check`); setIsAuth(true); loadAll(); }
        catch { setIsAuth(false); }
        finally { setAuthLoading(false); }
    };

    const loadAll = () => { fetchProducts(); fetchOrders(); fetchStats(); fetchChart(); fetchCoupons(); fetchSettings(); fetchReviews(); };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true); setAuthErr("");
        try { await axios.post(`/api/admin/login`, { password: pw }); setIsAuth(true); loadAll(); }
        catch { setAuthErr("Invalid password"); } finally { setLoading(false); }
    };

    const handleLogout = async () => {
        try { await axios.post(`/api/admin/logout`); } catch { }
        setIsAuth(false);
    };

    const showToast = (type: "success" | "error", text: string) => setToast({ type, text });

    const fetchProducts = async () => { try { const r = await axios.get(`/api/products`); setProducts(r.data); } catch { } };
    const fetchStats = async () => { try { const r = await axios.get(`/api/orders/stats`); setStats(r.data); } catch { } };
    const fetchChart = async () => { try { const r = await axios.get(`/api/orders/daily-revenue`); setChartData(r.data); } catch { } };
    const fetchCoupons = async () => { try { const r = await axios.get(`/api/coupons`); setCoupons(r.data); } catch { } };
    const fetchReviews = async () => { try { const r = await axios.get(`/api/admin/reviews`); setReviews(r.data); } catch { } };

    const fetchOrders = useCallback(async () => {
        try {
            const r = await axios.get(`/api/orders`, { params: { search: oSearch || undefined, status: oStatus !== "all" ? oStatus : undefined, page: oPage, limit: 12 } });
            const { orders: o, total, pages } = r.data;
            setOrders(o); setOTotal(total); setOPages(pages);
            // Notification: check for new orders
            if (lastOrderCount.current > 0 && total > lastOrderCount.current) {
                setNewOrderCount(total - lastOrderCount.current);
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("🚨 New Order!", { body: `${total - lastOrderCount.current} new order(s) received` });
                }
            }
            lastOrderCount.current = total;
        } catch { }
    }, [oSearch, oStatus, oPage]);

    useEffect(() => { if (isAuth) fetchOrders(); }, [fetchOrders, isAuth]);

    // Poll for new orders every 30s
    useEffect(() => {
        if (!isAuth) return;
        if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
        const interval = setInterval(() => { fetchOrders(); fetchStats(); }, 30000);
        return () => clearInterval(interval);
    }, [isAuth, fetchOrders]);

    // ─── Image Handling ───
    const handleFiles = (files: File[]) => {
        setPImages(files); setPPreviews(files.map(f => URL.createObjectURL(f)));
    };
    const onImgChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) handleFiles(Array.from(e.target.files)); };
    const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) handleFiles(Array.from(e.dataTransfer.files)); };

    // ─── Create Product ───
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pName || !pPrice || !pDesc || pImages.length === 0) { setPMsg({ type: "error", text: "All fields and at least one image required." }); return; }
        setLoading(true); setPMsg(null);
        const fd = new FormData();
        fd.append("name", pName); fd.append("price", pPrice); fd.append("description", pDesc);
        fd.append("category", pCat); fd.append("stock", pStock || "0");
        if (pVariants.length > 0) fd.append("variants", JSON.stringify(pVariants));
        pImages.forEach(img => fd.append("images", img));
        try {
            await axios.post(`/api/products`, fd, { headers: { "Content-Type": "multipart/form-data" } });
            showToast("success", "Product uploaded!"); setPName(""); setPPrice(""); setPDesc(""); setPCat("General");
            setPStock(""); setPImages([]); setPPreviews([]); setPVariants([]); if (fileRef.current) fileRef.current.value = "";
            fetchProducts(); fetchStats();
        } catch (err: any) { setPMsg({ type: "error", text: err.response?.data?.message || "Failed." }); }
        finally { setLoading(false); }
    };

    // ─── Delete / Bulk Delete ───
    const handleDelete = async (id: string) => {
        if (!confirm("Delete this product?")) return;
        try { await axios.delete(`/api/products/${id}`); showToast("success", "Deleted."); fetchProducts(); fetchStats(); }
        catch { showToast("error", "Failed."); }
    };
    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Delete ${selectedIds.size} products?`)) return;
        try { await axios.post(`/api/products/bulk-delete`, { ids: Array.from(selectedIds) }); showToast("success", `${selectedIds.size} products deleted.`); setSelectedIds(new Set()); fetchProducts(); fetchStats(); }
        catch { showToast("error", "Failed."); }
    };
    const toggleSelect = (id: string) => { const s = new Set(selectedIds); s.has(id) ? s.delete(id) : s.add(id); setSelectedIds(s); };
    const toggleSelectAll = () => { if (selectedIds.size === pagedProducts.length) setSelectedIds(new Set()); else setSelectedIds(new Set(pagedProducts.map(p => p._id))); };

    // ─── Edit Product ───
    const openEdit = (p: Product) => { setEditP(p); setEName(p.name); setEPrice(String(p.price)); setEDesc(p.description); setECat(p.category || "General"); setEStock(String(p.stock || 0)); setEVariants(p.variants || []); setEImages([...p.imageUrls]); };
    const saveEdit = async () => {
        if (!editP) return;
        try { await axios.put(`/api/products/${editP._id}`, { name: eName, price: ePrice, description: eDesc, category: eCat, stock: eStock, variants: eVariants, imageUrls: eImages }); showToast("success", "Updated!"); setEditP(null); fetchProducts(); fetchStats(); }
        catch { showToast("error", "Failed."); }
    };
    const addEditImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editP || !e.target.files) return;
        const fd = new FormData();
        Array.from(e.target.files).forEach(f => fd.append("images", f));
        try { const r = await axios.post(`/api/products/${editP._id}/images`, fd, { headers: { "Content-Type": "multipart/form-data" } }); setEImages(r.data.imageUrls); showToast("success", "Images added!"); }
        catch { showToast("error", "Failed."); }
    };
    const removeEditImage = (idx: number) => { const n = [...eImages]; n.splice(idx, 1); setEImages(n); };

    // ─── Order Status ───
    const updateStatus = async (id: string, status: string) => {
        try { await axios.put(`/api/orders/${id}/status`, { status }); showToast("success", `→ ${status}`); fetchOrders(); }
        catch { showToast("error", "Failed."); }
    };
    const copyText = (t: string) => { navigator.clipboard.writeText(t); showToast("success", "Copied!"); };

    // ─── CSV Export ───
    const exportCSV = () => { window.open(`/api/orders/export-csv?status=${oStatus}`, "_blank"); };

    // ─── Coupons ───
    const createCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cCode || !cDisc) { showToast("error", "Code & discount required"); return; }
        try { await axios.post(`/api/coupons`, { code: cCode, discountPercent: parseInt(cDisc), maxDiscount: parseInt(cMax) || 0, usageLimit: parseInt(cLimit) || 0, expiresAt: cExpiry || null }); showToast("success", "Coupon created!"); setCCode(""); setCDisc(""); setCMax(""); setCLimit(""); setCExpiry(""); fetchCoupons(); }
        catch (err: any) { showToast("error", err.response?.data?.message || "Failed."); }
    };
    const deleteCoupon = async (id: string) => { try { await axios.delete(`/api/coupons/${id}`); showToast("success", "Deleted."); fetchCoupons(); } catch { } };
    const toggleCoupon = async (id: string) => { try { await axios.put(`/api/coupons/${id}/toggle`); fetchCoupons(); } catch { } };

    // ─── Reviews ───
    const deleteReview = async (id: string) => {
        if (!confirm("Are you sure you want to delete this review?")) return;
        try {
            await axios.delete(`/api/admin/reviews/${id}`);
            showToast("success", "Review deleted.");
            fetchReviews();
        } catch {
            showToast("error", "Failed to delete review.");
        }
    };

    // ─── Settings ───
    const fetchSettings = async () => {
        try {
            const r = await axios.get(`/api/settings`);
            if (r.data.shippingZones) setSZones(r.data.shippingZones);
            if (r.data.categories) setSCategories(r.data.categories);
            if (r.data.banner) setSBanner(r.data.banner);
            if (r.data.marquee) setSMarquee(r.data.marquee);
            if (r.data.marketing) setSMarketing(r.data.marketing);
            if (r.data.showDeliveryZone !== undefined) setSShowDeliveryZone(r.data.showDeliveryZone);
            if (r.data.features) setSFeatures(r.data.features);
        } catch { }
    };
    const saveSetting = async (key: string, value: any) => {
        setSLoading(true);
        try { await axios.put(`/api/settings/${key}`, { value }); showToast('success', `${key} saved!`); }
        catch { showToast('error', 'Failed to save'); }
        finally { setSLoading(false); }
    };

    // ─── Invoice Print ───
    const printInvoice = (o: Order) => {
        const w = window.open('', '_blank', 'width=800,height=600');
        if (!w) return;
        w.document.write(`<!DOCTYPE html><html><head><title>Invoice #${o.orderNumber}</title><style>
            body{font-family:Arial,sans-serif;padding:40px;color:#333;max-width:700px;margin:0 auto}
            h1{color:#6d28d9;margin-bottom:4px}h2{margin-top:30px;border-bottom:2px solid #6d28d9;padding-bottom:6px}
            table{width:100%;border-collapse:collapse;margin-top:10px}th,td{padding:10px;text-align:left;border-bottom:1px solid #eee}
            th{background:#f9f5ff;color:#6d28d9;font-weight:600}.total{font-size:20px;font-weight:bold;color:#6d28d9}
            .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:10px}
            .info-box{background:#f9f5ff;padding:15px;border-radius:8px}.label{color:#888;font-size:12px;margin-bottom:4px}
            .footer{margin-top:40px;text-align:center;color:#aaa;font-size:12px;border-top:1px solid #eee;padding-top:15px}
        </style></head><body>
            <h1>Invoice #${o.orderNumber}</h1>
            <p style="color:#888">${new Date(o.createdAt).toLocaleString()}</p>
            <h2>Customer</h2>
            <div class="info-grid">
                <div class="info-box"><div class="label">Name</div><strong>${o.customerName}</strong></div>
                <div class="info-box"><div class="label">Phone</div><strong>${o.customerPhone}</strong></div>
                <div class="info-box" style="grid-column:1/3"><div class="label">Address</div><strong>${o.customerAddress}</strong></div>
            </div>
            <h2>Payment</h2>
            <div class="info-grid">
                <div class="info-box"><div class="label">Method</div><strong>Bkash</strong></div>
                <div class="info-box"><div class="label">Bkash Number</div><strong>${o.bkashNumber}</strong></div>
                <div class="info-box" style="grid-column:1/3"><div class="label">Transaction ID</div><strong>${o.transactionId}</strong></div>
            </div>
            <h2>Products</h2>
            <table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead><tbody>
            ${o.products.map(p => `<tr><td>${p.name}</td><td>${p.quantity}</td><td>৳${p.price.toLocaleString()}</td><td>৳${(p.price * p.quantity).toLocaleString()}</td></tr>`).join('')}
            </tbody></table>
            ${o.couponCode ? `<p style="margin-top:10px;color:#6d28d9">🎫 Coupon: ${o.couponCode} (-৳${(o.discountAmount || 0).toLocaleString()})</p>` : ''}
            <p style="text-align:right;margin-top:15px" class="total">Total: ৳${o.totalAmount.toLocaleString()}</p>
            <p style="text-align:right"><span style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background:${o.status === 'delivered' ? '#d1fae5' : o.status === 'shipped' ? '#ede9fe' : o.status === 'confirmed' ? '#dbeafe' : '#fef3c7'};color:${o.status === 'delivered' ? '#065f46' : o.status === 'shipped' ? '#5b21b6' : o.status === 'confirmed' ? '#1e40af' : '#92400e'}">${o.status.toUpperCase()}</span></p>
            <div class="footer">ShopVibe — Thank you for your purchase! 💜</div>
        </body></html>`);
        w.document.close();
        w.print();
    };

    // ─── Variants helpers ───
    const addVariant = (list: Variant[], setList: (v: Variant[]) => void) => { setList([...list, { label: "", size: "", color: "", stock: 0, priceAdjust: 0 }]); };
    const updateVariant = (list: Variant[], setList: (v: Variant[]) => void, idx: number, field: string, value: string | number) => {
        const n = [...list]; (n[idx] as any)[field] = value; setList(n);
    };
    const removeVariant = (list: Variant[], setList: (v: Variant[]) => void, idx: number) => { const n = [...list]; n.splice(idx, 1); setList(n); };

    // ─── Product Filtering/Sorting/Pagination ───
    const filtered = products.filter(p => p.name.toLowerCase().includes(pSearch.toLowerCase()) || (p.category || "").toLowerCase().includes(pSearch.toLowerCase()));
    const sorted = [...filtered].sort((a, b) => {
        switch (pSort) {
            case "name-asc": return a.name.localeCompare(b.name);
            case "name-desc": return b.name.localeCompare(a.name);
            case "price-asc": return a.price - b.price;
            case "price-desc": return b.price - a.price;
            case "stock-asc": return (a.stock || 0) - (b.stock || 0);
            case "stock-desc": return (b.stock || 0) - (a.stock || 0);
            case "date-asc": return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            default: return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
    });
    const totalPPages = Math.ceil(sorted.length / PER_PAGE);
    const pagedProducts = sorted.slice((pPage - 1) * PER_PAGE, pPage * PER_PAGE);

    // ─── Variant Renderer ───
    const VariantEditor = ({ variants, setVariants }: { variants: Variant[]; setVariants: (v: Variant[]) => void }) => (
        <div className="space-y-2">
            <div className="flex items-center justify-between"><label className="text-sm text-gray-400">Variants</label>
                <button type="button" onClick={() => addVariant(variants, setVariants)} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"><Plus className="w-3 h-3" />Add</button></div>
            {variants.map((v, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 items-center">
                    <input type="text" value={v.label} onChange={e => updateVariant(variants, setVariants, i, "label", e.target.value)} placeholder="Label" className="input-field text-xs col-span-2" />
                    <input type="text" value={v.size} onChange={e => updateVariant(variants, setVariants, i, "size", e.target.value)} placeholder="Size" className="input-field text-xs" />
                    <input type="number" value={v.stock} onChange={e => updateVariant(variants, setVariants, i, "stock", parseInt(e.target.value) || 0)} placeholder="Stock" className="input-field text-xs" />
                    <button type="button" onClick={() => removeVariant(variants, setVariants, i)} className="p-1 hover:bg-red-500/10 rounded text-red-400"><X className="w-3 h-3" /></button>
                </div>
            ))}
        </div>
    );

    // ─── AUTH SCREEN ───
    if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;
    if (!isAuth) return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="glass-card p-10 max-w-md w-full text-center border border-violet-500/20 shadow-2xl shadow-violet-500/10">
                <div className="w-16 h-16 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="w-8 h-8 text-violet-400" /></div>
                <h2 className="text-2xl font-bold text-white mb-2">Admin Access</h2>
                <p className="text-gray-400 mb-8">Enter the master password to continue.</p>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter password" className="input-field text-center tracking-widest font-mono" autoFocus />
                    {authErr && <div className="text-sm text-red-400 bg-red-500/10 p-2 rounded-lg">{authErr}</div>}
                    <button type="submit" disabled={loading || !pw} className="btn-primary w-full">{loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Unlock Dashboard"}</button>
                </form>
            </div>
        </div>
    );

    // ─── MAIN ───
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium ${toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
                    {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{toast.text}
                    <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
                            <Package className="w-4 h-4 text-violet-400" /><span className="text-sm text-violet-300">Admin Panel</span>
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20">
                            <div className="relative flex items-center justify-center w-3 h-3">
                                <span className="absolute inline-flex w-full h-full rounded-full bg-fuchsia-400 opacity-75 animate-ping"></span>
                                <span className="relative inline-flex w-2 h-2 rounded-full bg-fuchsia-500"></span>
                            </div>
                            <span className="text-sm font-medium text-fuchsia-300">
                                <Users className="w-3.5 h-3.5 inline mr-1 mb-0.5" />
                                Live Visitors: {liveVisitors}
                            </span>
                        </div>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Dashboard</h1>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors self-start sm:self-auto font-medium text-sm">
                    <LogOut className="w-4 h-4" /> Sign Out
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 mb-8 w-fit flex-wrap">
                {([
                    { id: "overview" as TabType, label: "Overview", icon: BarChart3 },
                    { id: "products" as TabType, label: "Products", icon: Package },
                    { id: "orders" as TabType, label: "Orders", icon: ShoppingCart, badge: newOrderCount },
                    { id: "coupons" as TabType, label: "Coupons", icon: Tag },
                    { id: "reviews" as TabType, label: "Reviews", icon: Star },
                    { id: "settings" as TabType, label: "Settings", icon: Settings },
                    { id: "oms" as TabType, label: "OMS", icon: Truck }
                ]).map(t => (
                    <button key={t.id} onClick={() => { setTab(t.id); if (t.id === "orders") setNewOrderCount(0); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all relative ${tab === t.id ? "bg-violet-600/30 text-violet-300 border border-violet-500/30" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                        <t.icon className="w-4 h-4" />{t.label}
                        {t.badge !== undefined && t.badge > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse">{t.badge}</span>}
                    </button>
                ))}
            </div>

            {/* ═══ OVERVIEW ═══ */}
            {tab === "overview" && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="glass-card p-6 border border-white/5" style={{ transform: "none" }}><div className="flex items-center justify-between mb-4"><span className="text-sm text-gray-400">Total Revenue</span><div className="p-2 rounded-lg bg-emerald-500/10"><DollarSign className="w-5 h-5 text-emerald-400" /></div></div><p className="text-3xl font-bold text-white">৳{stats.totalRevenue.toLocaleString()}</p></div>
                        <div className="glass-card p-6 border border-white/5" style={{ transform: "none" }}><div className="flex items-center justify-between mb-4"><span className="text-sm text-gray-400">Total Orders</span><div className="p-2 rounded-lg bg-violet-500/10"><TrendingUp className="w-5 h-5 text-violet-400" /></div></div><p className="text-3xl font-bold text-white">{stats.totalOrders}</p></div>
                        <div className="glass-card p-6 border border-white/5" style={{ transform: "none" }}><div className="flex items-center justify-between mb-4"><span className="text-sm text-gray-400">Active Products</span><div className="p-2 rounded-lg bg-fuchsia-500/10"><Box className="w-5 h-5 text-fuchsia-400" /></div></div><p className="text-3xl font-bold text-white">{stats.totalProducts}</p></div>
                    </div>
                    <RevenueChart data={chartData} />
                    <div><h3 className="text-lg font-semibold mb-4 text-gray-200">Recent Orders</h3>
                        {orders.length === 0 ? <div className="glass-card p-10 text-center" style={{ transform: "none" }}><ShoppingCart className="w-10 h-10 text-gray-700 mx-auto mb-3" /><p className="text-gray-500">No orders yet.</p></div> : (
                            <div className="space-y-3">{orders.slice(0, 5).map(o => (
                                <div key={o._id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ transform: "none" }}>
                                    <div><p className="font-medium text-white">Order #{o.orderNumber} — {o.customerName}</p><p className="text-sm text-gray-400">৳{o.totalAmount.toLocaleString()} • {new Date(o.createdAt).toLocaleDateString()}</p></div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${STATUS_COLORS[o.status]}`}>{o.status}</span>
                                </div>
                            ))}</div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ PRODUCTS ═══ */}
            {tab === "products" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Upload Form */}
                    <div className="glass-card p-8" style={{ transform: "none" }}>
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><Upload className="w-5 h-5 text-violet-400" /> Upload Product</h2>
                        {pMsg && <div className={`flex items-center gap-2 p-4 rounded-xl mb-6 ${pMsg.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border border-red-500/20 text-red-300"}`}>{pMsg.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}{pMsg.text}</div>}
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div><label className="text-sm text-gray-400 mb-1 block">Product Name</label><input type="text" value={pName} onChange={e => setPName(e.target.value)} placeholder="e.g. Premium Headphones" className="input-field" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-sm text-gray-400 mb-1 block">Price (৳)</label><input type="number" value={pPrice} onChange={e => setPPrice(e.target.value)} placeholder="2500" className="input-field" /></div>
                                <div><label className="text-sm text-gray-400 mb-1 block">Stock</label><input type="number" value={pStock} onChange={e => setPStock(e.target.value)} placeholder="10" className="input-field" /></div>
                            </div>
                            <div><label className="text-sm text-gray-400 mb-1 block">Category</label><input type="text" value={pCat} onChange={e => setPCat(e.target.value)} placeholder="Electronics" className="input-field" /></div>
                            <div><label className="text-sm text-gray-400 mb-1 block">Description</label><textarea value={pDesc} onChange={e => setPDesc(e.target.value)} placeholder="Short description..." rows={3} className="input-field resize-none" /></div>
                            {/* Drag & Drop */}
                            <div>
                                <div className="flex items-baseline justify-between mb-1">
                                    <label className="text-sm text-gray-400 block">Product Images</label>
                                    <span className="text-xs text-violet-400/80">Recommended: 1080x1080 (1:1) for Meta Ads</span>
                                </div>
                                <div onClick={() => fileRef.current?.click()} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}
                                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragOver ? "border-violet-400 bg-violet-500/10" : "border-gray-700 hover:border-violet-500/50"}`}>
                                    {pPreviews.length > 0 ? <div className="grid grid-cols-3 gap-2">{pPreviews.map((p, i) => <img key={i} src={p} alt="" className="w-full h-24 object-cover rounded-lg" />)}</div>
                                        : <div className="flex flex-col items-center gap-2 text-gray-500"><ImagePlus className="w-10 h-10" /><span className="text-sm">Drag & drop or click to upload</span></div>}
                                </div>
                                <input ref={fileRef} type="file" accept="image/*" multiple onChange={onImgChange} className="hidden" />
                            </div>
                            <VariantEditor variants={pVariants} setVariants={setPVariants} />
                            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                                {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Uploading...</> : <><Upload className="w-5 h-5" />Upload Product</>}
                            </button>
                        </form>
                    </div>

                    {/* Product List */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2"><Package className="w-5 h-5 text-fuchsia-400" /> Products ({sorted.length})</h2>
                            {selectedIds.size > 0 && <button onClick={handleBulkDelete} className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20"><Trash2 className="w-3 h-3" />Delete {selectedIds.size}</button>}
                        </div>
                        <div className="flex gap-2 mb-4">
                            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input type="text" value={pSearch} onChange={e => { setPSearch(e.target.value); setPPage(1); }} placeholder="Search..." className="input-field pl-10 text-sm" /></div>
                            <div className="relative"><select value={pSort} onChange={e => setPSort(e.target.value)} className="appearance-none bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-violet-500/50 cursor-pointer">
                                <option value="date-desc" className="bg-[#1a1225]">Newest</option><option value="date-asc" className="bg-[#1a1225]">Oldest</option>
                                <option value="name-asc" className="bg-[#1a1225]">Name A-Z</option><option value="name-desc" className="bg-[#1a1225]">Name Z-A</option>
                                <option value="price-asc" className="bg-[#1a1225]">Price ↑</option><option value="price-desc" className="bg-[#1a1225]">Price ↓</option>
                                <option value="stock-asc" className="bg-[#1a1225]">Stock ↑</option><option value="stock-desc" className="bg-[#1a1225]">Stock ↓</option>
                            </select><ArrowUpDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" /></div>
                        </div>
                        {/* Select All */}
                        {pagedProducts.length > 0 && <label className="flex items-center gap-2 mb-3 text-xs text-gray-400 cursor-pointer"><input type="checkbox" checked={selectedIds.size === pagedProducts.length && pagedProducts.length > 0} onChange={toggleSelectAll} className="accent-violet-500" />Select all on page</label>}
                        {pagedProducts.length === 0 ? <div className="glass-card p-12 text-center" style={{ transform: "none" }}><Package className="w-12 h-12 text-gray-700 mx-auto mb-3" /><p className="text-gray-500">No products found.</p></div> : (
                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                                {pagedProducts.map(p => (
                                    <div key={p._id} className={`glass-card flex items-center gap-3 p-3 ${selectedIds.has(p._id) ? "ring-1 ring-violet-500/50" : ""}`} style={{ transform: "none" }}>
                                        <input type="checkbox" checked={selectedIds.has(p._id)} onChange={() => toggleSelect(p._id)} className="accent-violet-500 flex-shrink-0" />
                                        {p.imageUrls?.[0] && <Image src={p.imageUrls[0]} alt={p.name} width={48} height={48} className="rounded-lg object-cover flex-shrink-0" />}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium truncate text-sm">{p.name}</h3>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <span className="text-sm text-violet-400 font-semibold">৳{p.price.toLocaleString()}</span>
                                                <span className="text-xs text-gray-500">•</span><span className="text-xs text-gray-400">{p.category || "General"}</span>
                                                <span className="text-xs text-gray-500">•</span><span className={`text-xs font-medium ${(p.stock || 0) > 0 ? "text-emerald-400" : "text-red-400"}`}>{(p.stock || 0) > 0 ? `${p.stock} stock` : "Out"}</span>
                                                {p.variants?.length > 0 && <><span className="text-xs text-gray-500">•</span><span className="text-xs text-fuchsia-400">{p.variants.length} variants</span></>}
                                            </div>
                                        </div>
                                        <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-violet-500/10 text-gray-500 hover:text-violet-400 transition-colors flex-shrink-0"><Edit3 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(p._id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Pagination */}
                        {totalPPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-4">
                                <button disabled={pPage <= 1} onClick={() => setPPage(p => p - 1)} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                                <span className="text-sm text-gray-400">{pPage} / {totalPPages}</span>
                                <button disabled={pPage >= totalPPages} onClick={() => setPPage(p => p + 1)} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ ORDERS ═══ */}
            {tab === "orders" && (
                <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-violet-400" /> Orders ({oTotal})</h2>
                        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors text-sm font-medium self-start sm:self-auto"><Download className="w-4 h-4" />Export CSV</button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input type="text" value={oSearch} onChange={e => { setOSearch(e.target.value); setOPage(1); }} placeholder="Search name, phone, TrxID..." className="input-field pl-10 text-sm" /></div>
                        <div className="relative"><select value={oStatus} onChange={e => { setOStatus(e.target.value); setOPage(1); }} className="appearance-none bg-white/5 border border-white/10 text-white text-sm rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-violet-500/50 cursor-pointer capitalize">
                            <option value="all" className="bg-[#1a1225]">All Status</option>{["pending", "confirmed", "shipped", "delivered"].map(s => <option key={s} value={s} className="bg-[#1a1225] capitalize">{s}</option>)}
                        </select><ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" /></div>
                    </div>
                    {orders.length === 0 ? <div className="glass-card p-16 text-center" style={{ transform: "none" }}><ShoppingCart className="w-12 h-12 text-gray-700 mx-auto mb-3" /><p className="text-gray-500">No orders found.</p></div> : (
                        <div className="space-y-4">
                            {orders.map(o => (
                                <div key={o._id} className="glass-card p-5" style={{ transform: "none" }}>
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1"><h3 className="font-semibold text-white">Order #{o.orderNumber}</h3><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_COLORS[o.status]}`}>{o.status}</span></div>
                                            <p className="text-sm text-gray-400">{new Date(o.createdAt).toLocaleString()}</p>
                                        </div>
                                        <div className="relative"><select value={o.status} onChange={e => updateStatus(o._id, e.target.value)} className="appearance-none bg-white/5 border border-white/10 text-white text-sm rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-violet-500/50 cursor-pointer capitalize">
                                            {["pending", "confirmed", "shipped", "delivered"].map(s => <option key={s} value={s} className="bg-[#1a1225] capitalize">{s}</option>)}</select><ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" /></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                        <div><span className="text-gray-500">Customer</span><p className="text-white font-medium">{o.customerName}</p><p className="text-gray-400">{o.customerPhone}</p></div>
                                        <div><span className="text-gray-500">Address</span><p className="text-white">{o.customerAddress}</p></div>
                                        <div><span className="text-gray-500">Payment</span><p className="text-white">Bkash: {o.bkashNumber}</p><div className="flex items-center gap-1"><span className="text-gray-400">TrxID: {o.transactionId}</span><button onClick={() => copyText(o.transactionId)} className="p-1 hover:bg-white/10 rounded"><Copy className="w-3 h-3 text-violet-400" /></button></div></div>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-white/5">
                                        <div className="flex flex-wrap gap-3">{o.products.map((p, i) => <span key={i} className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-gray-300">{p.name} × {p.quantity} — ৳{(p.price * p.quantity).toLocaleString()}</span>)}</div>
                                        {o.couponCode && <p className="text-xs text-fuchsia-400 mt-2">🎫 Coupon: {o.couponCode} (-৳{(o.discountAmount || 0).toLocaleString()})</p>}
                                        <p className="text-right font-bold text-lg gradient-text mt-2">৳{o.totalAmount.toLocaleString()}</p>
                                        <div className="flex justify-end mt-3">
                                            <button onClick={() => printInvoice(o)} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/20 transition-colors text-xs font-medium"><Printer className="w-3.5 h-3.5" />Print Invoice</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {oPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6">
                            <button disabled={oPage <= 1} onClick={() => setOPage(p => p - 1)} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                            <span className="text-sm text-gray-400">{oPage} / {oPages}</span>
                            <button disabled={oPage >= oPages} onClick={() => setOPage(p => p + 1)} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ COUPONS ═══ */}
            {tab === "coupons" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="glass-card p-8" style={{ transform: "none" }}>
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><Tag className="w-5 h-5 text-violet-400" /> Create Coupon</h2>
                        <form onSubmit={createCoupon} className="space-y-4">
                            <div><label className="text-sm text-gray-400 mb-1 block">Coupon Code</label><input type="text" value={cCode} onChange={e => setCCode(e.target.value.toUpperCase())} placeholder="SAVE20" className="input-field font-mono uppercase" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-sm text-gray-400 mb-1 block">Discount %</label><input type="number" value={cDisc} onChange={e => setCDisc(e.target.value)} placeholder="20" className="input-field" /></div>
                                <div><label className="text-sm text-gray-400 mb-1 block">Max Discount (৳)</label><input type="number" value={cMax} onChange={e => setCMax(e.target.value)} placeholder="0 = no cap" className="input-field" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-sm text-gray-400 mb-1 block">Usage Limit</label><input type="number" value={cLimit} onChange={e => setCLimit(e.target.value)} placeholder="0 = unlimited" className="input-field" /></div>
                                <div><label className="text-sm text-gray-400 mb-1 block">Expires</label><input type="date" value={cExpiry} onChange={e => setCExpiry(e.target.value)} className="input-field" /></div>
                            </div>
                            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2"><Plus className="w-5 h-5" />Create Coupon</button>
                        </form>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Tag className="w-5 h-5 text-fuchsia-400" /> Active Coupons ({coupons.length})</h2>
                        {coupons.length === 0 ? <div className="glass-card p-12 text-center" style={{ transform: "none" }}><Tag className="w-12 h-12 text-gray-700 mx-auto mb-3" /><p className="text-gray-500">No coupons yet.</p></div> : (
                            <div className="space-y-3">
                                {coupons.map(c => (
                                    <div key={c._id} className={`glass-card p-4 flex items-center justify-between ${!c.isActive ? "opacity-50" : ""}`} style={{ transform: "none" }}>
                                        <div>
                                            <p className="font-mono font-bold text-white">{c.code}</p>
                                            <p className="text-sm text-gray-400">{c.discountPercent}% off{c.maxDiscount > 0 ? ` (max ৳${c.maxDiscount})` : ""} • {c.usedCount}/{c.usageLimit || "∞"} used{c.expiresAt ? ` • Expires ${new Date(c.expiresAt).toLocaleDateString()}` : ""}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => toggleCoupon(c._id)} className={`px-3 py-1 rounded-lg text-xs font-medium ${c.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-500/10 text-gray-400"}`}>{c.isActive ? "Active" : "Paused"}</button>
                                            <button onClick={() => deleteCoupon(c._id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ REVIEWS ═══ */}
            {tab === "reviews" && (
                <div>
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><Star className="w-5 h-5 text-amber-400" /> Customer Reviews ({reviews.length})</h2>
                    {reviews.length === 0 ? (
                        <div className="glass-card p-16 text-center" style={{ transform: "none" }}>
                            <Star className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                            <p className="text-gray-500">No reviews found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {reviews.map(r => (
                                <div key={r._id} className="glass-card p-5 flex flex-col justify-between" style={{ transform: "none" }}>
                                    <div>
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h4 className="font-semibold text-white">{r.customerName}</h4>
                                                <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center gap-0.5 text-amber-400">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <Star key={star} className={`w-3.5 h-3.5 ${star <= r.rating ? 'fill-current' : 'text-gray-700'}`} />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-xs text-violet-400 font-mono mb-2 break-all pt-2 border-t border-white/5">Product ID: {r.productId}</div>
                                        {r.comment && <p className="text-sm text-gray-300 line-clamp-4 leading-relaxed mt-2">{r.comment}</p>}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                                        <button onClick={() => deleteReview(r._id)} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors text-xs font-medium"><Trash2 className="w-3.5 h-3.5" /> Delete Review</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ SETTINGS ═══ */}
            {tab === "settings" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Shipping Zones */}
                    <div className="glass-card p-6 sm:p-8" style={{ transform: "none" }}>
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><Settings className="w-5 h-5 text-violet-400" /> Shipping Zones</h2>
                        <div className="space-y-3">
                            {sZones.map((z, i) => (
                                <div key={i} className="grid grid-cols-[1fr_1fr_100px_40px] gap-2 items-center">
                                    <input type="text" value={z.id} onChange={e => { const n = [...sZones]; n[i].id = e.target.value; setSZones(n); }} placeholder="zone-id" className="input-field text-sm font-mono" />
                                    <input type="text" value={z.label} onChange={e => { const n = [...sZones]; n[i].label = e.target.value; setSZones(n); }} placeholder="Label" className="input-field text-sm" />
                                    <input type="number" value={z.cost} onChange={e => { const n = [...sZones]; n[i].cost = parseInt(e.target.value) || 0; setSZones(n); }} placeholder="Cost" className="input-field text-sm" />
                                    <button onClick={() => { const n = [...sZones]; n.splice(i, 1); setSZones(n); }} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setSZones([...sZones, { id: '', label: '', cost: 0 }])} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"><Plus className="w-3 h-3" />Add Zone</button>
                        </div>
                        <button onClick={() => saveSetting('shippingZones', sZones)} disabled={sLoading} className="btn-primary w-full mt-4 flex items-center justify-center gap-2 text-sm">{sLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Save Shipping</button>

                        {/* Delivery Zone Toggle */}
                        <div className="mt-6 pt-5 border-t border-gray-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-white">Show Delivery Zone on Checkout</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Toggle delivery zone picker visibility for customers</p>
                                </div>
                                <button onClick={async () => { const nv = !sShowDeliveryZone; setSShowDeliveryZone(nv); await saveSetting('showDeliveryZone', nv); }} className={`relative w-12 h-6 rounded-full transition-colors ${sShowDeliveryZone ? 'bg-sky-500' : 'bg-gray-700'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${sShowDeliveryZone ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="glass-card p-6 sm:p-8" style={{ transform: "none" }}>
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><Package className="w-5 h-5 text-fuchsia-400" /> Categories</h2>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {sCategories.map((c, i) => (
                                <div key={i} className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm">
                                    {c}
                                    <button onClick={() => { const n = [...sCategories]; n.splice(i, 1); setSCategories(n); }} className="p-0.5 hover:text-red-400 text-gray-500"><X className="w-3 h-3" /></button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input type="text" value={sNewCat} onChange={e => setSNewCat(e.target.value)} placeholder="New category name" className="input-field text-sm flex-1" onKeyDown={e => { if (e.key === 'Enter' && sNewCat.trim()) { setSCategories([...sCategories, sNewCat.trim()]); setSNewCat(''); } }} />
                            <button onClick={() => { if (sNewCat.trim()) { setSCategories([...sCategories, sNewCat.trim()]); setSNewCat(''); } }} className="px-4 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/20 text-sm"><Plus className="w-4 h-4" /></button>
                        </div>
                        <button onClick={() => saveSetting('categories', sCategories)} disabled={sLoading} className="btn-primary w-full mt-4 flex items-center justify-center gap-2 text-sm">{sLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Save Categories</button>
                    </div>

                    {/* Banner / Notice */}
                    <div className="glass-card p-6 sm:p-8 lg:col-span-2" style={{ transform: "none" }}>
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><Bell className="w-5 h-5 text-yellow-400" /> Store Banner / Notice</h2>
                        <div className="flex items-center gap-3 mb-4">
                            <button onClick={() => setSBanner({ ...sBanner, enabled: !sBanner.enabled })} className={`relative w-12 h-6 rounded-full transition-colors ${sBanner.enabled ? 'bg-violet-500' : 'bg-gray-700'}`}>
                                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${sBanner.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                            </button>
                            <span className="text-sm text-gray-400">{sBanner.enabled ? 'Banner Visible' : 'Banner Hidden'}</span>
                        </div>
                        <textarea value={sBanner.text} onChange={e => setSBanner({ ...sBanner, text: e.target.value })} placeholder="e.g. 🎉 Free delivery on orders above ৳2000! Limited time offer." rows={2} className="input-field resize-none mb-4" />
                        {sBanner.enabled && sBanner.text && (
                            <div className="p-3 rounded-xl bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20 text-sm text-gray-200 mb-4">Preview: {sBanner.text}</div>
                        )}
                        <button onClick={() => saveSetting('banner', sBanner)} disabled={sLoading} className="btn-primary flex items-center justify-center gap-2 text-sm px-8">{sLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Save Banner</button>
                    </div>

                    {/* Marquee Ticker */}
                    <div className="glass-card p-6 sm:p-8 lg:col-span-2" style={{ transform: "none" }}>
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" /> Marquee / Scrolling Text</h2>
                        <div className="flex items-center gap-3 mb-4">
                            <button onClick={() => setSMarquee({ ...sMarquee, enabled: !sMarquee.enabled })} className={`relative w-12 h-6 rounded-full transition-colors ${sMarquee.enabled ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${sMarquee.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                            </button>
                            <span className="text-sm text-gray-400">{sMarquee.enabled ? 'Ticker Visible' : 'Ticker Hidden'}</span>
                        </div>
                        <input type="text" value={sMarquee.text} onChange={e => setSMarquee({ ...sMarquee, text: e.target.value })} placeholder="e.g. 🔥 Flash Sale — 50% OFF on all items! | Free Delivery inside Dhaka" className="input-field mb-4" />

                        {/* Speed */}
                        <div className="mb-4">
                            <label className="text-sm text-gray-400 mb-2 block">Speed: {sMarquee.speed}s (lower = faster)</label>
                            <input type="range" min="5" max="30" value={sMarquee.speed} onChange={e => setSMarquee({ ...sMarquee, speed: parseInt(e.target.value) })} className="w-full accent-violet-500" />
                            <div className="flex justify-between text-xs text-gray-600 mt-1"><span>Fast (5s)</span><span>Slow (30s)</span></div>
                        </div>

                        {/* Background Color */}
                        <div className="mb-4">
                            <label className="text-sm text-gray-400 mb-2 block">Background Color</label>
                            <div className="flex gap-2 flex-wrap">
                                {[
                                    { id: 'gradient', label: 'Gradient', cls: 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600' },
                                    { id: 'red', label: 'Red', cls: 'bg-red-600' },
                                    { id: 'blue', label: 'Blue', cls: 'bg-blue-600' },
                                    { id: 'green', label: 'Green', cls: 'bg-emerald-600' },
                                    { id: 'orange', label: 'Orange', cls: 'bg-orange-500' },
                                    { id: 'black', label: 'Dark', cls: 'bg-gray-900' },
                                ].map(c => (
                                    <button key={c.id} onClick={() => setSMarquee({ ...sMarquee, bgColor: c.id })} className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white border-2 transition-all ${c.cls} ${sMarquee.bgColor === c.id ? 'border-white scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}>{c.label}</button>
                                ))}
                            </div>
                        </div>

                        {sMarquee.enabled && sMarquee.text && (
                            <div className={`p-2 rounded-xl text-sm text-white mb-4 overflow-hidden ${sMarquee.bgColor === 'gradient' ? 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600' :
                                sMarquee.bgColor === 'red' ? 'bg-red-600' :
                                    sMarquee.bgColor === 'blue' ? 'bg-blue-600' :
                                        sMarquee.bgColor === 'green' ? 'bg-emerald-600' :
                                            sMarquee.bgColor === 'orange' ? 'bg-orange-500' : 'bg-gray-900'
                                }`}>
                                <span className="marquee-text" style={{ animationDuration: `${sMarquee.speed}s` }}>{sMarquee.text}</span>
                            </div>
                        )}
                        <button onClick={() => saveSetting('marquee', sMarquee)} disabled={sLoading} className="btn-primary flex items-center justify-center gap-2 text-sm px-8">{sLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Save Ticker</button>
                    </div>

                    {/* Marketing & Tracking */}
                    <div className="glass-card p-6 sm:p-8 lg:col-span-2" style={{ transform: "none" }}>
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-400" /> Marketing & Tracking IDs</h2>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Google Tag Manager (GTM) ID</label>
                                <input type="text" value={sMarketing.gtmId} onChange={e => setSMarketing({ ...sMarketing, gtmId: e.target.value })} placeholder="e.g. GTM-XXXXXXX" className="input-field" />
                                <p className="text-xs text-gray-500 mt-1">Leave empty to disable. Manages all other tags if configured correctly.</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Meta Pixel (Facebook) ID</label>
                                <input type="text" value={sMarketing.pixelId} onChange={e => setSMarketing({ ...sMarketing, pixelId: e.target.value })} placeholder="e.g. 123456789012345" className="input-field" />
                                <p className="text-xs text-gray-500 mt-1">Leave empty to disable. Used for Facebook Ads tracking (Page View, Add To Cart, Purchase).</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Google Analytics 4 (GA4) Measurement ID</label>
                                <input type="text" value={sMarketing.ga4Id} onChange={e => setSMarketing({ ...sMarketing, ga4Id: e.target.value })} placeholder="e.g. G-XXXXXXXXXX" className="input-field" />
                                <p className="text-xs text-gray-500 mt-1">Leave empty to disable. Note: If you use GTM to deploy GA4, you do not need to enter this here.</p>
                            </div>
                        </div>
                        <button onClick={() => saveSetting('marketing', sMarketing)} disabled={sLoading} className="btn-primary flex items-center justify-center gap-2 text-sm px-8">{sLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Save Tracking IDs</button>
                    </div>

                    {/* Feature Toggles */}
                    <div className="glass-card p-6 sm:p-8 lg:col-span-2" style={{ transform: "none" }}>
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><Settings className="w-5 h-5 text-fuchsia-400" /> Feature Toggles</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">

                            <div className="glass-card p-4 border border-white/5 flex items-start justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-white mb-1">Track Order Page</h3>
                                    <p className="text-xs text-gray-500 max-w-[200px]">Allow customers to search their order status publicly.</p>
                                </div>
                                <button onClick={() => setSFeatures({ ...sFeatures, trackOrder: !sFeatures.trackOrder })} className={`relative w-12 h-6 flex-shrink-0 rounded-full transition-colors ${sFeatures.trackOrder ? 'bg-fuchsia-500' : 'bg-gray-700'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${sFeatures.trackOrder ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                            </div>

                            <div className="glass-card p-4 border border-white/5 flex items-start justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-white mb-1">Product Reviews</h3>
                                    <p className="text-xs text-gray-500 max-w-[200px]">Enable the 5-star Customer Review & Comments system.</p>
                                </div>
                                <button onClick={() => setSFeatures({ ...sFeatures, productReviews: !sFeatures.productReviews })} className={`relative w-12 h-6 flex-shrink-0 rounded-full transition-colors ${sFeatures.productReviews ? 'bg-fuchsia-500' : 'bg-gray-700'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${sFeatures.productReviews ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                            </div>

                            <div className="glass-card p-4 border border-white/5 flex items-start justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-white mb-1">Related Products</h3>
                                    <p className="text-xs text-gray-500 max-w-[200px]">Show "You May Also Like" items at the bottom of products.</p>
                                </div>
                                <button onClick={() => setSFeatures({ ...sFeatures, relatedProducts: !sFeatures.relatedProducts })} className={`relative w-12 h-6 flex-shrink-0 rounded-full transition-colors ${sFeatures.relatedProducts ? 'bg-fuchsia-500' : 'bg-gray-700'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${sFeatures.relatedProducts ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                            </div>

                        </div>
                        <button onClick={() => saveSetting('features', sFeatures)} disabled={sLoading} className="btn-primary flex items-center justify-center gap-2 text-sm px-8">{sLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Save Features Setup</button>
                    </div>

                </div>
            )}

            {/* ═══ OMS (Order Management — Pathao) ═══ */}
            {tab === "oms" && (() => {
                // Fetch OMS orders on tab open
                const fetchOmsOrders = async () => {
                    setOmsLoading(true);
                    try { const res = await fetch('/api/orders'); if (res.ok) { const data = await res.json(); setOmsOrders(data.orders || data); } } catch (err) { console.error(err); }
                    finally { setOmsLoading(false); }
                };
                if (omsOrders.length === 0 && !omsLoading) fetchOmsOrders();

                const openOmsModal = (order: any) => {
                    const totalQty = order.products?.reduce((s: number, p: any) => s + (p.quantity || 1), 0) || 1;
                    const desc = order.products?.map((p: any) => `${p.name} x${p.quantity}`).join(', ') || `Order #${order.orderNumber}`;
                    const amount = order.paymentMethod === 'cod' ? order.totalAmount : 0;
                    setOmsModalData({ itemWeight: 0.5, deliveryType: 48, specialInstruction: `Order #${order.orderNumber} | Payment: ${(order.paymentMethod || 'cod').toUpperCase()}`, itemDescription: desc, amountToCollect: amount, itemQuantity: totalQty });
                    setOmsModalOrder(order);
                };

                const handleOmsSubmit = async () => {
                    if (!omsModalOrder) return;
                    setOmsProcessingId(omsModalOrder._id);
                    setOmsModalOrder(null);
                    try {
                        const result = await sendOrderToPathao(omsModalOrder._id, omsModalData);
                        if (result?.success) {
                            showToast('success', `✅ Sent! CN: ${result.consignmentId}${result.deliveryFee ? ` | Fee: ৳${result.deliveryFee}` : ''}`);
                            setOmsOrders(prev => prev.map(o => o._id === omsModalOrder._id ? { ...o, status: 'confirmed', consignmentId: result.consignmentId, pathaoStatus: 'Pickup_Pending' } : o));
                        } else { showToast('error', `❌ ${result?.error}`); }
                    } catch (err: any) { showToast('error', `❌ ${err.message}`); }
                    finally { setOmsProcessingId(null); }
                };

                const omsStatusStyles: Record<string, string> = {
                    pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
                    confirmed: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
                    shipped: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
                    delivered: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
                };

                return (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold flex items-center gap-2"><Truck className="w-5 h-5 text-violet-400" /> Pathao Courier — OMS</h2>
                            <button onClick={() => { setOmsOrders([]); }} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-sm text-gray-400">
                                <RefreshCw className="w-4 h-4" /> Refresh
                            </button>
                        </div>

                        {/* Table */}
                        <div className="glass-card border border-white/5 overflow-hidden" style={{ transform: 'none' }}>
                            <table className="w-full text-sm text-left">
                                <thead className="border-b border-white/10">
                                    <tr>
                                        <th className="px-6 py-4 text-gray-400 font-medium">Order</th>
                                        <th className="px-6 py-4 text-gray-400 font-medium">Customer</th>
                                        <th className="px-6 py-4 text-gray-400 font-medium">Payment</th>
                                        <th className="px-6 py-4 text-gray-400 font-medium">Status</th>
                                        <th className="px-6 py-4 text-gray-400 font-medium">Amount</th>
                                        <th className="px-6 py-4 text-gray-400 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {omsLoading ? (
                                        <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /><p>Loading orders...</p></td></tr>
                                    ) : omsOrders.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-500"><Package className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No orders found.</p></td></tr>
                                    ) : (
                                        omsOrders.map((order: any) => (
                                            <tr key={order._id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-semibold text-white">#{order.orderNumber}</span>
                                                    <div className="text-xs text-gray-500 mt-0.5">{new Date(order.createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-white">{order.customerName}</div>
                                                    <div className="text-xs text-gray-500">{order.customerPhone}</div>
                                                </td>
                                                <td className="px-6 py-4"><span className="uppercase text-xs font-semibold tracking-wider text-gray-400">{order.paymentMethod || 'cod'}</span></td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${omsStatusStyles[order.status] || 'text-gray-400 bg-white/5 border-white/10'}`}>{order.status}</span>
                                                    {order.consignmentId && <div className="text-[11px] text-gray-500 mt-1 font-mono">CN: {order.consignmentId}</div>}
                                                    {order.consignmentId && (
                                                        <button onClick={() => setOmsExpandedId(omsExpandedId === order._id ? null : order._id)} className="text-[11px] text-violet-400 hover:text-violet-300 mt-1 underline">
                                                            {omsExpandedId === order._id ? 'Hide Timeline' : 'View Timeline'}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-white">৳{order.totalAmount}</td>
                                                <td className="px-6 py-4 text-right">
                                                    {!order.consignmentId ? (
                                                        <button onClick={() => openOmsModal(order)} disabled={omsProcessingId === order._id}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 text-sm font-medium rounded-lg transition-all border border-violet-500/30 disabled:opacity-50">
                                                            {omsProcessingId === order._id ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> : <><Send className="w-4 h-4" />Send to Pathao</>}
                                                        </button>
                                                    ) : (
                                                        <a href={`https://merchant.pathao.com/tracking?consignment_id=${order.consignmentId}&phone=${order.customerPhone}`} target="_blank" rel="noreferrer"
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium border border-white/10 rounded-lg transition-all">
                                                            Track Order
                                                        </a>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Timeline Expansion */}
                        {omsExpandedId && (() => {
                            const order = omsOrders.find((o: any) => o._id === omsExpandedId);
                            if (!order || !order.consignmentId) return null;
                            const activeIdx = getTimelineIndex(order.pathaoStatus);
                            return (
                                <div className="glass-card p-6 border border-white/5" style={{ transform: 'none' }}>
                                    <div className="flex items-center gap-2 mb-6">
                                        <Truck className="w-5 h-5 text-violet-400" />
                                        <h3 className="text-lg font-bold text-white">Delivery Timeline — #{order.orderNumber}</h3>
                                        <span className="ml-auto text-xs text-gray-500 font-mono">CN: {order.consignmentId}</span>
                                    </div>
                                    <div className="flex items-center justify-between relative">
                                        <div className="absolute top-6 left-8 right-8 h-0.5 bg-white/10 z-0" />
                                        <div className="absolute top-6 left-8 h-0.5 bg-violet-500 z-10 transition-all duration-500" style={{ width: `${(activeIdx / (TIMELINE_STEPS.length - 1)) * (100 - 10)}%` }} />
                                        {TIMELINE_STEPS.map((step, idx) => {
                                            const Icon = step.icon;
                                            const isCompleted = idx <= activeIdx;
                                            const isCurrent = idx === activeIdx;
                                            return (
                                                <div key={step.key} className="flex flex-col items-center relative z-20 flex-1">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all
                                                        ${isCurrent ? 'border-violet-500 bg-violet-500/20 text-violet-400 shadow-lg shadow-violet-500/20' :
                                                            isCompleted ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' :
                                                                'border-white/10 bg-white/5 text-gray-600'}`}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <span className={`mt-2 text-xs font-semibold text-center ${isCurrent ? 'text-violet-400' : isCompleted ? 'text-emerald-400' : 'text-gray-600'}`}>{step.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* OMS Send Modal */}
                        {omsModalOrder && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                <div className="bg-[#110C1D] border border-violet-500/20 rounded-2xl shadow-2xl shadow-violet-500/10 w-full max-w-lg mx-4 overflow-hidden">
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                                        <div>
                                            <h3 className="text-lg font-bold text-white">Send to Pathao</h3>
                                            <p className="text-xs text-gray-500">Order #{omsModalOrder.orderNumber} — {omsModalOrder.customerName}</p>
                                        </div>
                                        <button onClick={() => setOmsModalOrder(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                                    </div>
                                    <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1.5">Delivery Type</label>
                                            <select value={omsModalData.deliveryType} onChange={e => setOmsModalData({ ...omsModalData, deliveryType: Number(e.target.value) })} className="input-field">
                                                <option value={48} className="bg-[#1a1225]">Normal Delivery</option>
                                                <option value={12} className="bg-[#1a1225]">On-Demand Delivery</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-1.5">Total Weight (kg)</label>
                                                <select value={omsModalData.itemWeight} onChange={e => setOmsModalData({ ...omsModalData, itemWeight: parseFloat(e.target.value) || 0.5 })} className="input-field">
                                                    <option value={0.2} className="bg-[#1a1225]">0-0.2</option>
                                                    <option value={0.5} className="bg-[#1a1225]">0.2-0.5</option>
                                                    <option value={1} className="bg-[#1a1225]">0.5-1</option>
                                                    <option value={1.5} className="bg-[#1a1225]">1-1.5</option>
                                                    <option value={2} className="bg-[#1a1225]">1.5-2</option>
                                                    <option value={3} className="bg-[#1a1225]">2-3</option>
                                                    <option value={4} className="bg-[#1a1225]">3-4</option>
                                                    <option value={5} className="bg-[#1a1225]">4-5</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-1.5">Quantity</label>
                                                <input type="number" min="1" value={omsModalData.itemQuantity} onChange={e => setOmsModalData({ ...omsModalData, itemQuantity: parseInt(e.target.value) || 1 })} className="input-field" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1.5">Amount to Collect (৳)</label>
                                            <input type="number" min="0" value={omsModalData.amountToCollect} onChange={e => setOmsModalData({ ...omsModalData, amountToCollect: parseFloat(e.target.value) || 0 })} className="input-field" />
                                            <p className="text-xs text-gray-600 mt-1">{(omsModalOrder.paymentMethod || 'cod') === 'cod' ? 'COD — customer pays on delivery' : 'Prepaid — already paid'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1.5">Item Description & Price</label>
                                            <input type="text" value={omsModalData.itemDescription} onChange={e => setOmsModalData({ ...omsModalData, itemDescription: e.target.value })} className="input-field" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1.5">Special Instructions</label>
                                            <textarea rows={3} value={omsModalData.specialInstruction} onChange={e => setOmsModalData({ ...omsModalData, specialInstruction: e.target.value })} className="input-field resize-none" placeholder="e.g. Handle with care, fragile..." />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                                        <button onClick={() => setOmsModalOrder(null)} className="px-4 py-2.5 text-sm font-medium text-gray-400 border border-white/10 rounded-lg hover:bg-white/5">Cancel</button>
                                        <button onClick={handleOmsSubmit} className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 text-sm font-semibold rounded-lg border border-violet-500/30 transition-all">
                                            <Send className="w-4 h-4" /> Send to Pathao
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ═══ EDIT MODAL ═══ */}
            {
                editP && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <div className="bg-[#110C1D] border border-violet-500/20 rounded-2xl p-8 max-w-lg w-full shadow-2xl shadow-violet-500/10 relative my-8">
                            <button onClick={() => setEditP(null)} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Edit3 className="w-5 h-5 text-violet-400" /> Edit Product</h2>
                            <div className="space-y-4">
                                <div><label className="text-sm text-gray-400 mb-1 block">Name</label><input type="text" value={eName} onChange={e => setEName(e.target.value)} className="input-field" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-sm text-gray-400 mb-1 block">Price (৳)</label><input type="number" value={ePrice} onChange={e => setEPrice(e.target.value)} className="input-field" /></div>
                                    <div><label className="text-sm text-gray-400 mb-1 block">Stock</label><input type="number" value={eStock} onChange={e => setEStock(e.target.value)} className="input-field" /></div>
                                </div>
                                <div><label className="text-sm text-gray-400 mb-1 block">Category</label><input type="text" value={eCat} onChange={e => setECat(e.target.value)} className="input-field" /></div>
                                <div><label className="text-sm text-gray-400 mb-1 block">Description</label><textarea value={eDesc} onChange={e => setEDesc(e.target.value)} rows={3} className="input-field resize-none" /></div>
                                {/* Image Management */}
                                <div><label className="text-sm text-gray-400 mb-1 block">Images</label>
                                    <div className="grid grid-cols-4 gap-2 mb-2">{eImages.map((url, i) => (
                                        <div key={i} className="relative group"><img src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
                                            <button onClick={() => removeEditImage(i)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                        </div>
                                    ))}</div>
                                    <button type="button" onClick={() => editFileRef.current?.click()} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"><Plus className="w-3 h-3" />Add Images</button>
                                    <input ref={editFileRef} type="file" accept="image/*" multiple onChange={addEditImages} className="hidden" />
                                </div>
                                <VariantEditor variants={eVariants} setVariants={setEVariants} />
                                <button onClick={saveEdit} className="btn-primary w-full flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" /> Save Changes</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
