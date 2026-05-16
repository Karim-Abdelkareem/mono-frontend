"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Power, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import TablePagination from "@/app/components/Pagination";
import {
  COVERED_ZONE_STATUS,
  Zone,
  getApiErrorMessage,
  getGovernmentById,
  getZoneStorefrontState,
  getZones,
  isTurboCovered,
  toggleZone,
  zoneStorefrontBadgeClass,
  zoneStorefrontLabel,
} from "@/app/lib/shippingService";

type ZoneFilter = "covered" | "storefront-active" | "storefront-inactive";

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, index) => (
        <tr key={`zone-skeleton-${index}`} className="animate-pulse">
          {Array.from({ length: 5 }).map((__, col) => (
            <td key={col} className="px-4 py-3">
              <div className="h-4 rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function GovernmentZonesPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const governmentId = typeof params.governmentId === "string" ? params.governmentId : "";
  const governmentNameFromUrl = searchParams.get("name") ?? "";

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>(() => {
    const param = searchParams.get("filter");
    if (param === "storefront-active") return "storefront-active";
    if (param === "storefront-inactive") return "storefront-inactive";
    return "covered";
  });
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page") ?? 1)));
  const [limit, setLimit] = useState(Math.max(1, Number(searchParams.get("limit") ?? 20)));

  const updateUrl = useCallback(
    (next: { search: string; filter: ZoneFilter; page: number; limit: number }) => {
      const urlParams = new URLSearchParams();
      if (governmentNameFromUrl) urlParams.set("name", governmentNameFromUrl);
      if (next.search.trim()) urlParams.set("search", next.search.trim());
      if (next.filter !== "covered") urlParams.set("filter", next.filter);
      if (next.page > 1) urlParams.set("page", String(next.page));
      if (next.limit !== 20) urlParams.set("limit", String(next.limit));
      const query = urlParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [governmentNameFromUrl, pathname, router],
  );

  useEffect(() => {
    updateUrl({ search, filter: zoneFilter, page, limit });
  }, [limit, page, search, updateUrl, zoneFilter]);

  const { data: government, isLoading: govLoading } = useQuery({
    queryKey: ["government", governmentId],
    queryFn: () => getGovernmentById(governmentId),
    enabled: Boolean(governmentId),
  });

  const zoneQueryOptions = useMemo(() => {
    if (zoneFilter === "storefront-active") return { activeOnly: true };
    if (zoneFilter === "storefront-inactive") return { activeOnly: false };
    return { coveredOnly: true };
  }, [zoneFilter]);

  const {
    data: allZones = [],
    isLoading: zonesLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["zones", governmentId, zoneFilter],
    queryFn: () => getZones(governmentId, zoneQueryOptions),
    enabled: Boolean(governmentId),
  });

  const handleToggle = async (zone: Zone) => {
    setTogglingId(zone._id);
    try {
      await toggleZone(zone._id, !zone.isActive);
      await queryClient.invalidateQueries({ queryKey: ["zones", governmentId] });
      toast.success(
        zone.isActive
          ? `${zone.name} hidden from storefront.`
          : `${zone.name} enabled for storefront.`,
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update zone."));
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allZones
      .filter(
        (z) =>
          !query ||
          z.name.toLowerCase().includes(query) ||
          String(z.turboZoneId).includes(query),
      )
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [allZones, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, totalPages);
  const zones = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, currentPage, limit]);

  const displayName = government?.name || governmentNameFromUrl || "Government";
  const isLoading = govLoading || zonesLoading;
  const errorMessage = error ? getApiErrorMessage(error, "Failed to load zones.") : "";
  const activeStoreCount = allZones.filter((z) => getZoneStorefrontState(z) === "active").length;
  const hiddenCount = allZones.filter((z) => getZoneStorefrontState(z) === "hidden").length;

  if (!governmentId) {
    return (
      <div className="w-full px-4 py-6 md:px-8">
        <p className="text-sm text-gray-500">Missing government id.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 md:px-8">
      <nav className="mb-4 flex items-center gap-1 text-sm text-gray-500">
        <Link href="/shipping/governments" className="hover:text-gray-900">
          Governments
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="truncate font-medium text-gray-900" dir="auto">
          {displayName}
        </span>
        <ChevronRight className="size-3.5" />
        <span className="text-gray-700">Zones</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/shipping/governments"
            className="mb-3 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="size-4" />
            Back to governments
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900" dir="auto">
            Zones — {displayName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Turbo <span dir="rtl">{COVERED_ZONE_STATUS}</span> status vs admin storefront flag.
            Toggle hides zones without changing Turbo sync.
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

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { value: "covered" as const, label: "Covered in Turbo" },
            { value: "storefront-active" as const, label: "Storefront active" },
            { value: "storefront-inactive" as const, label: "Storefront inactive" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setZoneFilter(tab.value);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              zoneFilter === tab.value
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
          placeholder="Search zone name or Turbo ID…"
          className="w-full max-w-md rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
          dir="auto"
        />
        <p className="text-sm text-gray-600">
          {isLoading
            ? "Loading…"
            : `${total} zones · ${activeStoreCount} active · ${hiddenCount} hidden`}
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
              <th className="px-4 py-3 font-medium">Turbo status</th>
              <th className="px-4 py-3 font-medium">Storefront</th>
              <th className="px-4 py-3 font-medium">Turbo zone ID</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <TableSkeleton />
            ) : errorMessage ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-red-600">
                  {errorMessage}
                </td>
              </tr>
            ) : zones.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                  No zones found for this governorate.
                </td>
              </tr>
            ) : (
              zones.map((zone) => (
                <ZoneRow
                  key={zone._id}
                  zone={zone}
                  onToggle={handleToggle}
                  isToggling={togglingId === zone._id}
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

function ZoneRow({
  zone,
  onToggle,
  isToggling,
}: {
  zone: Zone;
  onToggle: (zone: Zone) => void;
  isToggling: boolean;
}) {
  const storefrontState = getZoneStorefrontState(zone);

  return (
    <tr className="hover:bg-gray-50/70">
      <td className="px-4 py-3 font-medium text-gray-900" dir="auto">
        {zone.name}
      </td>
      <td className="px-4 py-3" dir="auto">
        <span
          className={`text-gray-700 ${isTurboCovered(zone.status) ? "" : "text-red-600"}`}
        >
          {zone.status || "—"}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${zoneStorefrontBadgeClass(storefrontState)}`}
        >
          {zoneStorefrontLabel(storefrontState)}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-gray-600">{zone.turboZoneId}</td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => onToggle(zone)}
          disabled={isToggling}
          title={zone.isActive ? "Hide from storefront" : "Show on storefront"}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <Power className="size-3.5" />
          {isToggling ? "…" : zone.isActive ? "Disable" : "Enable"}
        </button>
      </td>
    </tr>
  );
}
