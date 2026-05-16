"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, MapPin, Power, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import TablePagination from "@/app/components/Pagination";
import {
  Government,
  getApiErrorMessage,
  getGovernments,
  governmentActiveBadgeClass,
  toggleGovernment,
} from "@/app/lib/shippingService";

type ActiveFilter = "all" | "active" | "inactive";

function formatDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, index) => (
        <tr key={`gov-skeleton-${index}`} className="animate-pulse">
          {Array.from({ length: 6 }).map((__, col) => (
            <td key={col} className="px-4 py-3">
              <div className="h-4 rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function GovernmentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(() => {
    const param = searchParams.get("active");
    if (param === "true") return "active";
    if (param === "false") return "inactive";
    return "all";
  });
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page") ?? 1)));
  const [limit, setLimit] = useState(Math.max(1, Number(searchParams.get("limit") ?? 20)));

  const updateUrl = useCallback(
    (next: { search: string; active: ActiveFilter; page: number; limit: number }) => {
      const params = new URLSearchParams();
      if (next.search.trim()) params.set("search", next.search.trim());
      if (next.active === "active") params.set("active", "true");
      if (next.active === "inactive") params.set("active", "false");
      if (next.page > 1) params.set("page", String(next.page));
      if (next.limit !== 20) params.set("limit", String(next.limit));
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router],
  );

  useEffect(() => {
    updateUrl({ search, active: activeFilter, page, limit });
  }, [activeFilter, limit, page, search, updateUrl]);

  const {
    data: allGovernments = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["governments", activeFilter],
    queryFn: () =>
      getGovernments({
        activeFilter:
          activeFilter === "active" ? "true" : activeFilter === "inactive" ? "false" : "all",
      }),
  });

  const handleToggle = async (government: Government) => {
    setTogglingId(government._id);
    try {
      await toggleGovernment(government._id, !government.isActive);
      await queryClient.invalidateQueries({ queryKey: ["governments"] });
      toast.success(
        government.isActive
          ? `${government.name} disabled for storefront.`
          : `${government.name} enabled for storefront.`,
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update government."));
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allGovernments
      .filter(
        (g) =>
          !query ||
          g.name.toLowerCase().includes(query) ||
          g.turboId.toLowerCase().includes(query),
      )
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [activeFilter, allGovernments, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, totalPages);
  const governments = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, currentPage, limit]);

  const errorMessage = error ? getApiErrorMessage(error, "Failed to load governments.") : "";
  const activeCount = allGovernments.filter((g) => g.isActive).length;

  return (
    <div className="w-full px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Governments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Turbo governorates (محافظات). Names sync daily at 03:30 Cairo — enable or disable
            for the storefront.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-900">
        <MapPin className="mt-0.5 size-4 shrink-0" />
        <p>
          Names come from Turbo sync. Use toggle to show or hide a governorate in address pickers
          (`GET ?active=true`). Match <span className="font-medium">government name</span> and{" "}
          <span className="font-medium">zone name</span> on orders at checkout.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { value: "all" as const, label: "All" },
            { value: "active" as const, label: "Active" },
            { value: "inactive" as const, label: "Inactive" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setActiveFilter(tab.value);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === tab.value
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
          placeholder="Search by name or Turbo ID…"
          className="w-full max-w-md rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
          dir="auto"
        />
        <p className="text-sm text-gray-600">
          {isLoading
            ? "Loading…"
            : `${total} shown · ${activeCount} active of ${allGovernments.length}`}
        </p>
        <select
          value={String(limit)}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="20">20 / page</option>
          <option value="50">50 / page</option>
          <option value="100">100 / page</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Turbo ID</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3 font-medium">Last updated</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <TableSkeleton />
            ) : errorMessage ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-red-600">
                  {errorMessage}
                </td>
              </tr>
            ) : governments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  No governments match your filters.
                </td>
              </tr>
            ) : (
              governments.map((gov) => (
                <GovernmentRow
                  key={gov._id}
                  government={gov}
                  onToggle={handleToggle}
                  isToggling={togglingId === gov._id}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && !errorMessage && filtered.length > 0 ? (
        <TablePagination
          className="mt-4"
          page={currentPage}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}

function GovernmentRow({
  government,
  onToggle,
  isToggling,
}: {
  government: Government;
  onToggle: (government: Government) => void;
  isToggling: boolean;
}) {
  const zonesHref = `/shipping/governments/${government._id}/zones?name=${encodeURIComponent(government.name)}`;

  return (
    <tr className="hover:bg-gray-50/70">
      <td className="px-4 py-3 font-medium text-gray-900" dir="auto">
        {government.name}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-gray-600">{government.turboId}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${governmentActiveBadgeClass(government.isActive)}`}
        >
          {government.isActive ? "Active" : "Disabled"}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-600">{formatDateTime(government.updatedAt)}</td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onToggle(government)}
            disabled={isToggling}
            title={government.isActive ? "Disable for storefront" : "Enable for storefront"}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Power className="size-3.5" />
            {isToggling ? "…" : government.isActive ? "Disable" : "Enable"}
          </button>
          <Link
            href={zonesHref}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Zones
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </td>
    </tr>
  );
}
