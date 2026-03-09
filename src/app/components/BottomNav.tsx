"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Search, ShoppingCart, Heart, PackageSearch } from "lucide-react";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/track", label: "Track", icon: PackageSearch },
  { href: "/checkout", label: "Cart", icon: ShoppingCart, badge: "cart" },
  { href: "/wishlist", label: "Wishlist", icon: Heart, badge: "wishlist" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [wishCount, setWishCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCounts = () => {
      const wl = JSON.parse(localStorage.getItem("wishlist") || "[]");
      setWishCount(wl.length);
      const ct = JSON.parse(localStorage.getItem("cart") || "[]");
      setCartCount(ct.length);
    };

    updateCounts();

    window.addEventListener("wishlist-updated", updateCounts);
    window.addEventListener("cart-updated", updateCounts);
    return () => {
      window.removeEventListener("wishlist-updated", updateCounts);
      window.removeEventListener("cart-updated", updateCounts);
    };
  }, []);

  // Hide on admin pages
  if (pathname?.startsWith("/admin")) return null;

  // Hide on product detail pages when sticky buy bar is visible
  const isProductPage = pathname?.startsWith("/product/");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--background)]/95 backdrop-blur-xl border-t border-[var(--card-border)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(item.href);
          const Icon = item.icon;
          const badgeCount =
            item.badge === "wishlist"
              ? wishCount
              : item.badge === "cart"
              ? cartCount
              : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-3 py-1 rounded-xl transition-colors ${
                isActive
                  ? "text-violet-500"
                  : "text-[var(--text-muted)] active:text-violet-400"
              }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "stroke-[2.5]" : "stroke-[1.5]"
                  }`}
                />
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-pink-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 font-medium ${
                  isActive ? "text-violet-500" : ""
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-violet-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
