"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArchiveRestore, Eye, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Coupon,
  CouponStatus,
  archiveCoupon,
  getApiErrorMessage,
  getCoupons,
  unarchiveCoupon,
} from "@/app/lib/couponService";

type ActiveFilter = "all" | "true" | "false";

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB");
}

function money(value: number | null) {
  if (value === null) return "No minimum";
  return `$${Number(value || 0).toFixed(2)}`;
}

function CouponTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={`coupon-skeleton-${index}`} className="animate-pulse">
          {Array.from({ length: 9 }).map((__, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <div className="h-4 rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function CouponsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [couponToArchive, setCouponToArchive] = useState<Coupon | null>(null);
  const [couponToUnarchive, setCouponToUnarchive] = useState<Coupon | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState<"all" | CouponStatus>(
    searchParams.get("status") === "archived" ? "archived" : "all",
  );
  const [isActiveFilter, setIsActiveFilter] = useState<ActiveFilter>(
    searchParams.get("isActive") === "true"
      ? "true"
      : searchParams.get("isActive") === "false"
        ? "false"
        : "all",
  );
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page") ?? 1)));
  const [limit, setLimit] = useState(Math.max(1, Number(searchParams.get("limit") ?? 10)));
  const updateUrl = useCallback(
    (next: {
      search: string;
      status: "all" | CouponStatus;
      isActive: ActiveFilter;
      page: number;
      limit: number;
    }) => {
      const params = new URLSearchParams();
      if (next.search.trim()) params.set("search", next.search.trim());
      if (next.status !== "all") params.set("status", next.status);
      if (next.isActive !== "all") params.set("isActive", next.isActive);
      if (next.page > 1) params.set("page", String(next.page));
      if (next.limit !== 10) params.set("limit", String(next.limit));

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router],
  );

  useEffect(() => {
    updateUrl({
      search,
      status: statusFilter,
      isActive: isActiveFilter,
      page,
      limit,
    });
  }, [isActiveFilter, limit, page, search, statusFilter, updateUrl]);

  const {
    data: couponsResult,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["coupons", search, statusFilter, isActiveFilter, page, limit],
    queryFn: () =>
      getCoupons({
        search: search.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        isActive: isActiveFilter === "all" ? undefined : isActiveFilter === "true",
        page,
        limit,
      }),
  });

  const coupons = useMemo(() => couponsResult?.coupons ?? [], [couponsResult?.coupons]);
  const total = couponsResult?.pagination.total ?? 0;
  const totalPages = Math.max(1, couponsResult?.pagination.totalPages ?? 1);
  const hasData = useMemo(() => coupons.length > 0, [coupons]);
  const errorMessage = error ? getApiErrorMessage(error, "Failed to fetch coupons.") : "";

  const handleArchive = async () => {
    if (!couponToArchive || couponToArchive.status === "archived") return;
    setArchivingId(couponToArchive._id);
    try {
      await archiveCoupon(couponToArchive._id);
      toast.success(`Coupon ${couponToArchive.code} archived.`);
      await refetch();
      setCouponToArchive(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to archive coupon."));
    } finally {
      setArchivingId(null);
    }
  };

  const handleUnarchive = async () => {
    if (!couponToUnarchive || couponToUnarchive.status !== "archived") return;
    setArchivingId(couponToUnarchive._id);
    try {
      await unarchiveCoupon(couponToUnarchive._id);
      toast.success(`Coupon ${couponToUnarchive.code} unarchived.`);
      await refetch();
      setCouponToUnarchive(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to unarchive coupon."));
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div className="mx-auto w-full px-4 py-6 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-500">Manage coupon availability and limits.</p>
        </div>
        <Link
          href="/coupons/add-coupon"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          <Plus className="size-4" />
          Add coupon
        </Link>
      </div>

      <div className="mb-4 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-5">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search by coupon code..."
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
        />
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as "all" | CouponStatus);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={isActiveFilter}
          onChange={(event) => {
            setIsActiveFilter(event.target.value as ActiveFilter);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
        >
          <option value="all">All active state</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
        <select
          value={String(limit)}
          onChange={(event) => {
            setLimit(Number(event.target.value));
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
        >
          <option value="10">10 / page</option>
          <option value="20">20 / page</option>
          <option value="50">50 / page</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Discount</th>
              <th className="px-4 py-3 font-medium">Usage</th>
              <th className="px-4 py-3 font-medium">Min Order</th>
              <th className="px-4 py-3 font-medium">Max/User</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <CouponTableSkeleton />
            ) : errorMessage ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-red-600">
                  {errorMessage}
                </td>
              </tr>
            ) : !hasData ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <p className="text-sm text-gray-700">No coupons found.</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Try changing filters or create a new coupon.
                  </p>
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon._id} className="hover:bg-gray-50/70">
                  <td className="px-4 py-3 font-medium text-gray-900">{coupon.code || "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{coupon.discount}%</td>
                  <td className="px-4 py-3 text-gray-700">
                    {coupon.uses} / {coupon.maxUses}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{money(coupon.minOrderAmount)}</td>
                  <td className="px-4 py-3 text-gray-700">{coupon.maxUsesPerUser}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        coupon.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {coupon.isActive ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        coupon.status === "archived"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {coupon.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(coupon.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/coupons/edit-coupon?id=${coupon._id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="size-3.5" />
                        View/Edit
                      </Link>
                      {coupon.status === "archived" ? (
                        <button
                          type="button"
                          onClick={() => setCouponToUnarchive(coupon)}
                          disabled={archivingId === coupon._id}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ArchiveRestore className="size-3.5" />
                          {archivingId === coupon._id ? "Unarchiving..." : "Unarchive"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCouponToArchive(coupon)}
                          disabled={archivingId === coupon._id}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" />
                          {archivingId === coupon._id ? "Archiving..." : "Archive"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && !errorMessage && hasData ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">
          <p className="text-gray-600">
            Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-gray-600">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {couponToArchive ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Archive coupon</h2>
            <p className="mt-2 text-sm text-gray-600">
              Archive this coupon? It will no longer be usable.
            </p>
            <p className="mt-2 text-sm font-medium text-gray-900">{couponToArchive.code}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCouponToArchive(null)}
                disabled={Boolean(archivingId)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchive}
                disabled={Boolean(archivingId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {archivingId ? "Archiving..." : "Archive coupon"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {couponToUnarchive ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Unarchive coupon</h2>
            <p className="mt-2 text-sm text-gray-600">
              Unarchive this coupon? It will become active again.
            </p>
            <p className="mt-2 text-sm font-medium text-gray-900">{couponToUnarchive.code}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCouponToUnarchive(null)}
                disabled={Boolean(archivingId)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnarchive}
                disabled={Boolean(archivingId)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {archivingId ? "Unarchiving..." : "Unarchive coupon"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
