"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  User,
  Users,
  type LucideIcon,
  BadgePercent,
  MapPin,
  Ruler,
} from "lucide-react";
import { api } from "../lib/api";
import { invalidateAuthQueries } from "../lib/auth-session";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type SidebarChildItem = {
  label: string;
  href: string;
};

type SidebarItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  children?: SidebarChildItem[];
};

const sidebarItems: SidebarItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    label: "Orders",
    icon: ShoppingCart,
    href: "/orders",
    children: [
      {
        label: "All Orders",
        href: "/orders",
      },
      {
        label: "Order Details",
        href: "/orders/order-details",
      },
    ],
  },
  {
    label: "Products",
    icon: Package,
    href: "/products",
    children: [
      {
        label: "Product List",
        href: "/products",
      },
      {
        label: "Add Product",
        href: "/products/add-product",
      },
    ],
  },
  {
    label: "Category",
    icon: Tags,
    href: "/category",
    children: [
      {
        label: "All Categories",
        href: "/category",
      },
      {
        label: "Add Category",
        href: "/category/add-category",
      },
    ],
  },
  {
    label: "Size charts",
    icon: Ruler,
    href: "/size-charts",
    children: [
      {
        label: "All charts",
        href: "/size-charts",
      },
      {
        label: "Create chart",
        href: "/size-charts/add-size-chart",
      },
    ],
  },
  {
    label: "Coupons",
    icon: BadgePercent,
    href: "/coupons",
    children: [
      {
        label: "All Coupons",
        href: "/coupons",
      },
      {
        label: "Add Coupon",
        href: "/coupons/add-coupon",
      },
    ],
  },
  {
    label: "Shipping",
    icon: MapPin,
    href: "/shipping/governments",
    children: [
      {
        label: "Governments",
        href: "/shipping/governments",
      },
    ],
  },
  {
    label: "Users",
    icon: Users,
    href: "/users",
  },
  {
    label: "Profile",
    icon: User,
    href: "/users/me",
  },
];
export default function Sidebar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    "/orders": false,
    "/products": false,
    "/category": false,
    "/coupons": false,
    "/size-charts": false,
    "/shipping/governments": false,
  });

  const toggleItem = (href: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [href]: !prev[href],
    }));
  };

  const handleLogout = async () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      toast.error("NEXT_PUBLIC_API_URL is not set.");
      return;
    }

    setIsLoggingOut(true);
    try {
      await api.post("/users/logout", {}, { baseURL: baseUrl });
      invalidateAuthQueries(queryClient);
      toast.success("Logged out successfully.");
      router.replace("/users/login");
    } catch {
      toast.error("Failed to logout.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside
      className={`flex h-screen sticky top-0 flex-col bg-white rounded-r-lg border-r border-gray-200 transition-all duration-300 ${
        isExpanded ? "w-64" : "w-20"
      }`}
    >
      <div
        className={`mb-6 flex items-center justify-between bg-black text-white ${isExpanded ? "p-4" : "p-2 justify-center"}`}
      >
        {isExpanded && (
          <svg
            className="sidebar-mono h-10 w-36"
            viewBox="0 0 520 140"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="MONO"
          >
            <text x="50%" y="62%" textAnchor="middle">
              MONO
            </text>
          </svg>
        )}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="rounded-md p-2 text-gray-300 hover:bg-black hover:text-white transition-colors cursor-pointer"
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <div className="flex flex-col">
        {sidebarItems.map((item) => (
          <div key={item.href} className="flex flex-col">
            {item.children && item.children.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  if (!isExpanded) {
                    const targetHref = item.children?.[0]?.href || item.href;
                    router.push(targetHref);
                    return;
                  }
                  toggleItem(item.href);
                }}
                className={`group flex w-full items-center p-4 text-gray-700 transition-colors hover:bg-black hover:text-white cursor-pointer ${
                  isExpanded ? "gap-3 justify-between" : "justify-center"
                }`}
                title={isExpanded ? undefined : item.label}
                aria-expanded={
                  isExpanded ? Boolean(expandedItems[item.href]) : undefined
                }
              >
                <span
                  className={`flex items-center ${
                    isExpanded ? "gap-3" : "justify-center"
                  }`}
                >
                  <item.icon size={18} />
                  {isExpanded && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </span>
                {isExpanded &&
                  (expandedItems[item.href] ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  ))}
              </button>
            ) : (
              <Link
                href={item.href}
                className={`group flex items-center p-4 text-gray-700 transition-colors hover:bg-black hover:text-white cursor-pointer ${
                  isExpanded ? "gap-3 justify-start" : "justify-center"
                }`}
                title={isExpanded ? undefined : item.label}
              >
                <item.icon size={18} />
                {isExpanded && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            )}

            {isExpanded &&
              item.children &&
              item.children.length > 0 &&
              expandedItems[item.href] && (
                <div className="mb-2 ml-11 flex flex-col gap-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="rounded-md px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-100 hover:text-black"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
          </div>
        ))}
      </div>
      <div className={`mt-auto border-t border-gray-200`}>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={`group flex w-full items-center rounded-md p-5 text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 ${
            isExpanded ? "gap-3 justify-start" : "justify-center"
          }`}
          title={isExpanded ? undefined : "Logout"}
        >
          <LogOut size={18} />
          {isExpanded && (
            <span className="text-sm font-medium">
              {isLoggingOut ? "Logging out..." : "Logout"}
            </span>
          )}
        </button>
      </div>
      <style jsx>{`
        .sidebar-mono text {
          fill: transparent;
          stroke: #f5f5f5;
          stroke-width: 2;
          stroke-dasharray: 900;
          stroke-dashoffset: 900;
          animation: sidebar-mono-draw 3s ease-in-out infinite;
          font-size: 84px;
          font-family: "Times New Roman", "Georgia", serif;
          letter-spacing: 8px;
          font-weight: 700;
        }

        @keyframes sidebar-mono-draw {
          0% {
            stroke-dashoffset: 900;
            fill: transparent;
          }
          55% {
            stroke-dashoffset: 0;
            fill: transparent;
          }
          70% {
            stroke-dashoffset: 0;
            fill: #ffffff;
          }
          100% {
            stroke-dashoffset: 900;
            fill: transparent;
          }
        }
      `}</style>
    </aside>
  );
}
