"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import TablePagination from "@/app/components/Pagination";
import {
  Coupon,
  couponStateBadgeClass,
  deleteCoupon,
  formatCouponValue,
  formatEgp,
  formatUsage,
  getApiErrorMessage,
  getCouponDisplayState,
  getCoupons,
  isCouponRestricted,
  toggleCoupon,
} from "@/app/lib/couponService";

type FilterTab = "all" | "active" | "inactive" | "expired" | "public" | "restricted";

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function CouponTableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={`coupon-skeleton-${index}`} className="animate-pulse">
          {Array.from({ length: 8 }).map((__, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <div className="h-4 rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "expired", label: "Expired" },
  { value: "public", label: "Public" },
  { value: "restricted", label: "Restricted" },
];

function matchesFilter(coupon: Coupon, filter: FilterTab) {
  if (filter === "all") return true;
  const state = getCouponDisplayState(coupon);
  if (filter === "active") return state === "active";
  if (filter === "inactive") return state === "inactive";
  if (filter === "expired") return state === "expired";
  if (filter === "public") return !isCouponRestricted(coupon);
  if (filter === "restricted") return isCouponRestricted(coupon);
  return true;
}

export default function CouponsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [actionId, setActionId] = useState<string | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [filter, setFilter] = useState<FilterTab>(
    (searchParams.get("filter") as FilterTab) || "all",
  );
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page") ?? 1)));
  const [limit, setLimit] = useState(Math.max(1, Number(searchParams.get("limit") ?? 20)));

  const updateUrl = useCallback(
    (next: { search: string; filter: FilterTab; page: number; limit: number }) => {
      const params = new URLSearchParams();
      if (next.search.trim()) params.set("search", next.search.trim());
      if (next.filter !== "all") params.set("filter", next.filter);
      if (next.page > 1) params.set("page", String(next.page));
      if (next.limit !== 20) params.set("limit", String(next.limit));
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router],
  );

  useEffect(() => {
    updateUrl({ search, filter, page, limit });
  }, [filter, limit, page, search, updateUrl]);

  const { data: allCoupons = [], isLoading, error } = useQuery({
    queryKey: ["coupons"],
    queryFn: getCoupons,
  });

  const filteredCoupons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allCoupons
      .filter((coupon) => matchesFilter(coupon, filter))
      .filter((coupon) => !query || coupon.code.toLowerCase().includes(query))
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  }, [allCoupons, filter, search]);

  const total = filteredCoupons.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, totalPages);
  const coupons = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredCoupons.slice(start, start + limit);
  }, [filteredCoupons, currentPage, limit]);

  const errorMessage = error ? getApiErrorMessage(error, "Failed to fetch coupons.") : "";

  const handleToggle = async (coupon: Coupon) => {
    setActionId(coupon._id);
    try {
      await toggleCoupon(coupon._id, !coupon.isActive);
      await queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success(coupon.isActive ? "Coupon deactivated." : "Coupon activated.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to toggle coupon."));
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async () => {
    if (!couponToDelete) return;
    setActionId(couponToDelete._id);
    try {
      await deleteCoupon(couponToDelete._id);
      await queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success(`Coupon ${couponToDelete.code} deleted.`);
      setCouponToDelete(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete coupon."));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="w-full px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-500">
            Create and manage percent or fixed discounts (EGP).
          </p>
        </div>
        <Link
          href="/coupons/add-coupon"
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-black"
        >
          <Plus className="size-4" />
          Add coupon
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setFilter(tab.value);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === tab.value
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by code…"
          className="w-full max-w-sm rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900 sm:flex-1"
        />
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>
            {isLoading ? "Loading…" : `${total} coupon${total === 1 ? "" : "s"}`}
          </span>
          <select
            value={String(limit)}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Type / Value</th>
              <th className="px-4 py-3 font-medium">Usage</th>
              <th className="px-4 py-3 font-medium">Min order</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Scope</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <CouponTableSkeleton />
            ) : errorMessage ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-red-600">
                  {errorMessage}
                </td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <p className="text-sm text-gray-700">No coupons found.</p>
                  <p className="mt-1 text-xs text-gray-500">Try another filter or create one.</p>
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => {
                const state = getCouponDisplayState(coupon);
                return (
                  <tr key={coupon._id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-gray-900">{coupon.code}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <span className="capitalize">{coupon.type}</span>
                      <span className="mx-1 text-gray-300">·</span>
                      {formatCouponValue(coupon)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatUsage(coupon)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {coupon.minOrderAmount > 0 ? formatEgp(coupon.minOrderAmount) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(coupon.expiresAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${couponStateBadgeClass(state)}`}
                      >
                        {state}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isCouponRestricted(coupon) ? (
                        <span className="inline-flex rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                          Restricted
                        </span>
                      ) : (
                        <span className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Public
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/coupons/edit-coupon?id=${coupon._id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          <Eye className="size-3.5" />
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleToggle(coupon)}
                          disabled={actionId === coupon._id}
                          title={coupon.isActive ? "Deactivate" : "Activate"}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Power className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCouponToDelete(coupon)}
                          disabled={actionId === coupon._id}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && !errorMessage && filteredCoupons.length > 0 ? (
        <TablePagination
          className="mt-4"
          page={currentPage}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      ) : null}

      {couponToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Delete coupon</h2>
            <p className="mt-2 text-sm text-gray-600">
              Permanently delete <span className="font-mono font-medium">{couponToDelete.code}</span>
              ? Existing orders keep their discount reference; this cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCouponToDelete(null)}
                disabled={Boolean(actionId)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={Boolean(actionId)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionId ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
