# 🔍 ShopVibe E-Commerce — Full Code Review Report

**Date:** March 9, 2026  
**Reviewer:** AI Code Auditor (Cline)  
**Project:** ShopVibe — Next.js + Express.js E-Commerce Platform

---

## 📋 Executive Summary

This is a **Bangladesh-focused e-commerce platform** built with:
- **Frontend:** Next.js 16 (App Router) with Tailwind CSS
- **Backend:** Express.js (legacy server) + Next.js API Routes (primary)
- **Database:** MongoDB Atlas (Mongoose)
- **Image Storage:** Cloudinary
- **Courier:** Pathao API Integration
- **Payments:** bKash, Nagad, Rocket, COD

Overall the codebase is **functional and well-structured** with good security practices already in place. However, there are several **critical bugs, security vulnerabilities, and architectural issues** that need attention.

---

## 🚨 CRITICAL ISSUES (Must Fix Immediately)

### 1. ⚠️ SECRETS EXPOSED IN GIT — `.env.local` files committed!
**Severity: CRITICAL**  
**Files:** `client/.env.local`, `server/.env`, `client/server/.env`

The `.gitignore` has `.env*` pattern, but the `client/` directory is a **git submodule** and its `.env.local` file contains:
- MongoDB Atlas credentials (username + password)
- Discord Webhook URL
- Cloudinary API keys
- Pathao API credentials (client_id, client_secret, username, password)
- JWT Secret
- Admin password

**⚡ Action Required:**
1. Immediately rotate ALL credentials (MongoDB password, Cloudinary keys, Pathao credentials, Discord webhook, JWT secret)
2. Ensure `client/.gitignore` properly excludes `.env.local`
3. Use `git filter-branch` or `BFG Repo-Cleaner` to remove secrets from git history
4. Never commit `.env` files

### 2. ⚠️ Weak Admin Password: `admin123`
**Severity: CRITICAL**  
**Files:** `client/.env.local`, `server/.env`

The admin password is `admin123` — extremely weak and easily guessable. Anyone can access the admin panel.

**Fix:** Use a strong password (16+ chars, mixed case, numbers, symbols).

### 3. ⚠️ JWT Secret is Predictable
**Severity: HIGH**  
**Files:** `client/.env.local`, `server/.env`

`JWT_SECRET=super_secret_ecom_key_2026` is easily guessable. An attacker could forge admin tokens.

**Fix:** Use a cryptographically random string (64+ chars): `openssl rand -hex 32`

---

## 🐛 BUGS

### 4. Order Number Generation — Race Condition
**Severity: HIGH**  
**Files:** `client/src/app/api/orders/route.ts`, `client/src/app/api/orders/draft/route.ts`

The `generateOrderNumber()` function uses a random 6-digit number and checks for uniqueness in a loop. This has:
- **Race condition:** Two concurrent orders could get the same number
- **Potential infinite loop:** If many orders exist, finding a unique 6-digit number becomes harder

The Express server (`server/routes/orderRoutes.js`) uses `count + 1` which is even worse — it can produce duplicates if orders are deleted.

**Fix:** Use MongoDB's `$inc` on a counter collection, or use a UUID/timestamp-based approach.

### 5. Checkout Page — `shippingCost` Always 0 but Shows "Free Delivery"
**Severity: MEDIUM**  
**File:** `client/src/app/checkout/page.tsx`

```javascript
const [shippingCost, setShippingCost] = useState(0);
```
The shipping cost starts at 0 and the UI says "Free Home Delivery" — but the product page (`client.tsx`) starts at 60. This inconsistency means:
- Orders from `/checkout` page always have ৳0 shipping
- Orders from product page have ৳60 shipping

### 6. Coupon Usage Not Incremented in Next.js API
**Severity: MEDIUM**  
**File:** `client/src/app/api/orders/route.ts`

When an order is placed via the Next.js API route, the coupon's `usedCount` is **never incremented**. The Express server does increment it, but the Next.js route (which is the primary one used) doesn't.

**Fix:** Add `await Coupon.findOneAndUpdate({ code: couponCode.toUpperCase() }, { $inc: { usedCount: 1 } });` after order creation.

### 7. Product Page SSR Fetch Uses Wrong URL
**Severity: MEDIUM**  
**File:** `client/src/app/product/[id]/page.tsx`

```javascript
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const res = await fetch(`${API}/api/products/${id}`, { cache: 'no-store' });
```
This fetches from `http://localhost:5000` (Express server) during SSR, but the actual API routes are Next.js API routes at `/api/products/[id]`. In production, this will fail because:
- The Express server may not be running
- The URL should be the Next.js server itself

**Fix:** Use absolute URL to the Next.js server or use direct database calls in server components.

### 8. Unused `API` Variable in Multiple Components
**Severity: LOW**  
**Files:** `client/src/app/page.tsx`, `client/src/app/components/Navbar.tsx`

```javascript
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
```
This variable is defined but never used — all fetch calls use relative URLs (`/api/...`). This is dead code.

### 9. Admin Page OMS Tab — `fetchOmsOrders` Called Inside Render
**Severity: MEDIUM**  
**File:** `client/src/app/admin/page.tsx`

The OMS tab uses an IIFE pattern inside the render:
```javascript
{tab === "oms" && (() => {
    const fetchOmsOrders = async () => { ... };
    if (omsOrders.length === 0 && !omsLoading) fetchOmsOrders();
    ...
})()}
```
This calls `fetchOmsOrders()` on every render when the tab is active and orders are empty, potentially causing infinite re-renders.

**Fix:** Move fetch logic to a `useEffect` that triggers when `tab === "oms"`.

### 10. Draft Order — No Authentication
**Severity: MEDIUM**  
**File:** `client/src/app/api/orders/draft/route.ts`

The draft order endpoint has no rate limiting or authentication. An attacker could spam this endpoint to create thousands of incomplete orders, polluting the database.

**Fix:** Add rate limiting or CAPTCHA verification.

---

## 🏗️ ARCHITECTURAL ISSUES

### 11. Duplicate Codebase — 3 Server Implementations!
**Severity: HIGH**

There are THREE separate server implementations:
1. `server/` — Express.js server (root level)
2. `client/server/` — Another Express.js server (inside client!)
3. `client/src/app/api/` — Next.js API Routes

This causes:
- Code duplication (models, routes defined 3 times)
- Inconsistent behavior between servers
- Confusion about which server handles what
- The `start.bat` starts `client/server` + `client` (Next.js), but `server/` also exists

**Fix:** Choose ONE backend approach. Since Next.js API routes are already comprehensive, remove the Express servers entirely.

### 12. `client/server/` Inside Client Directory
**Severity: MEDIUM**

Having a server directory inside the client directory is an anti-pattern. It creates confusion and makes deployment harder.

### 13. Inconsistent Order Schema Between Servers
**Severity: MEDIUM**

The Express server's order route uses `count + 1` for order numbers, while the Next.js API uses random 6-digit numbers. The Express server doesn't have `incomplete` status, but the Next.js API does.

---

## 🔒 SECURITY ISSUES

### 14. Settings API — No Admin Auth on GET
**Severity: LOW**  
**File:** `client/src/app/api/settings/route.ts`

The settings GET endpoint is public, exposing all store configuration including marketing IDs. While not critical, it leaks internal configuration.

### 15. Express Admin Login — No Rate Limiting (Brute Force)
**Severity: MEDIUM**  
**File:** `server/routes/adminRoutes.js`

The Express admin login has no rate limiting (unlike the Next.js version which has in-memory rate limiting). The `loginLimiter` in `server.js` applies to all `/api/admin` routes, not specifically login.

### 16. Express Admin Login — `sameSite: 'lax'` vs Next.js `sameSite: 'strict'`
**Severity: LOW**

The Express server uses `sameSite: 'lax'` while the Next.js API uses `sameSite: 'strict'`. Inconsistent CSRF protection.

### 17. In-Memory Rate Limiting Won't Work in Serverless
**Severity: MEDIUM**  
**File:** `client/src/app/api/admin/login/route.ts`

The `loginAttempts` Map is in-memory. In serverless environments (Vercel), each request may hit a different instance, making rate limiting ineffective.

**Fix:** Use Redis or a database-backed rate limiter for production.

### 18. Product DELETE Doesn't Clean Up Cloudinary Images
**Severity: LOW**  
**File:** `client/src/app/api/products/[id]/route.ts`

When a product is deleted, its images remain on Cloudinary, wasting storage.

---

## ⚡ PERFORMANCE ISSUES

### 19. Homepage Fetches ALL Products
**Severity: MEDIUM**  
**File:** `client/src/app/api/products/route.ts`

```javascript
const products = await Product.find().sort({ createdAt: -1 });
```
No pagination — fetches ALL products. With 1000+ products, this will be very slow.

**Fix:** Add pagination with `limit` and `skip`.

### 20. Multiple Redundant API Calls
**Severity: LOW**  
**Files:** Various components

- `page.tsx` (homepage) fetches `/api/settings`
- `Navbar.tsx` also fetches `/api/settings`
- `client.tsx` (product page) fetches `/api/settings` AND `/api/shipping`
- `checkout/page.tsx` fetches `/api/settings` AND `/api/shipping`

Each page load makes 2-4 settings API calls. Consider using React Context or SWR for caching.

### 21. Admin Page — Single Massive Component (~1500+ lines)
**Severity: MEDIUM**  
**File:** `client/src/app/admin/page.tsx`

The admin page is a single component with ~1500+ lines. This hurts:
- Maintainability
- Bundle size (entire admin loads at once)
- Performance

**Fix:** Split into separate components per tab (OverviewTab, ProductsTab, OrdersTab, etc.)

---

## 🎨 UI/UX ISSUES

### 22. Checkout Page — Phone Not Required in HTML but Required in API
**Severity: MEDIUM**  
**File:** `client/src/app/checkout/page.tsx`

The phone input has `required` attribute, but the Order model has `required: false`. The API validates phone format strictly (`/^01[3-9]\d{8}$/`), but the checkout form doesn't show this requirement to users.

### 23. Wishlist Page — No Error Handling for Missing Products
**Severity: LOW**  
**File:** `client/src/app/wishlist/page.tsx`

If a wishlisted product is deleted, the wishlist page will show broken entries.

### 24. Dark Mode Only — Light Mode Partially Implemented
**Severity: LOW**

The layout forces `className="dark"` on `<html>`. While there's a theme toggle, many CSS variables and hardcoded colors (e.g., `bg-gray-950`, `text-white`) won't properly switch to light mode.

---

## 📝 CODE QUALITY

### 25. TypeScript `any` Types Used Extensively
**Severity: LOW**

Many places use `any` type, losing TypeScript benefits:
- `(global as any).mongoose`
- `const updateData: any = {}`
- `catch (err: any)`
- Variant types as `any[]`

### 26. Console.error in Production
**Severity: LOW**

Many API routes have `console.error()` calls that will log to production servers. Consider using a proper logging library.

### 27. Typo in Discord Webhook
**Severity: LOW**  
**File:** `client/src/app/api/orders/route.ts`, `server/routes/orderRoutes.js`

```
"Prodcut name" → should be "Product name"
```

---

## ✅ WHAT'S DONE WELL

1. **Good security headers** in `next.config.ts` (X-Frame-Options, CSP, etc.)
2. **Input validation** on most API routes
3. **MongoDB connection pooling** with proper caching
4. **Database indexes** on all models for common queries
5. **Image validation** (file type, size limits) on upload
6. **Cloudinary integration** for image hosting
7. **SEO metadata** and Open Graph tags
8. **Structured data** (JSON-LD) on product pages
9. **Rate limiting** on admin login (Next.js version)
10. **Cookie-based auth** with httpOnly, secure flags
11. **Responsive design** with mobile-first approach
12. **Facebook Pixel** and GTM integration
13. **Draft order system** for abandoned cart recovery
14. **TTL index** on incomplete orders (auto-cleanup after 14 days)
15. **Discord webhook** notifications for new orders

---

## 🎯 Priority Action Items

| Priority | Issue | Action |
|----------|-------|--------|
| 🔴 P0 | Secrets in Git | Rotate ALL credentials immediately |
| 🔴 P0 | Weak admin password | Change to strong password |
| 🔴 P0 | Weak JWT secret | Generate cryptographic random secret |
| 🟠 P1 | Duplicate servers | Remove Express servers, use only Next.js API routes |
| 🟠 P1 | Coupon usage not incremented | Fix in Next.js orders API |
| 🟠 P1 | Product page SSR wrong URL | Fix server-side fetch URL |
| 🟠 P1 | Order number race condition | Use atomic counter |
| 🟡 P2 | No pagination on products | Add limit/skip to GET products |
| 🟡 P2 | Draft order spam | Add rate limiting |
| 🟡 P2 | Admin page too large | Split into components |
| 🟢 P3 | Shipping cost inconsistency | Standardize across pages |
| 🟢 P3 | Light mode broken | Fix CSS variables |
| 🟢 P3 | TypeScript any types | Add proper types |

---

*Report generated by AI Code Auditor. Review and prioritize fixes based on your deployment timeline.*
