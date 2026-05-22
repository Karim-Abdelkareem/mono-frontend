"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import TablePagination from "@/app/components/Pagination";
import {
  deleteSizeChart,
  getApiErrorMessage,
  getInactiveSizeCharts,
  getSizeChartDisplayName,
  getSizeCharts,
  toggleSizeChart,
} from "@/app/lib/sizeChartService";
import { SizeChart } from "@/app/lib/types/sizeChart";

type TabFilter = "all" | "active" | "inactive";

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function SizeChartsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<TabFilter>(
    (searchParams.get("tab") as TabFilter) || "all",
  );
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page") ?? 1)));
  const [limit, setLimit] = useState(Math.max(1, Number(searchParams.get("limit") ?? 20)));
  const [actionId, setActionId] = useState<string | null>(null);
  const [chartToDelete, setChartToDelete] = useState<SizeChart | null>(null);

  const updateUrl = useCallback(
    (next: { tab: TabFilter; search: string; page: number; limit: number }) => {
      const params = new URLSearchParams();
      if (next.tab !== "all") params.set("tab", next.tab);
      if (next.search.trim()) params.set("search", next.search.trim());
      if (next.page > 1) params.set("page", String(next.page));
      if (next.limit !== 20) params.set("limit", String(next.limit));
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router],
  );

  const { data: allCharts = [], isLoading, error } = useQuery({
    queryKey: ["size-charts", tab === "inactive" ? "inactive" : "all"],
    queryFn: tab === "inactive" ? getInactiveSizeCharts : getSizeCharts,
  });

  const filteredCharts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allCharts
      .filter((chart) => {
        if (tab === "active") return chart.isActive;
        if (tab === "inactive") return !chart.isActive;
        return true;
      })
      .filter((chart) => {
        if (!query) return true;
        const name = getSizeChartDisplayName(chart).toLowerCase();
        return (
          name.includes(query) ||
          chart.slug.toLowerCase().includes(query) ||
          (chart.name.ar ?? "").toLowerCase().includes(query)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
          new Date(a.updatedAt ?? a.createdAt ?? 0).getTime(),
      );
  }, [allCharts, search, tab]);

  const total = filteredCharts.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, totalPages);
  const charts = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredCharts.slice(start, start + limit);
  }, [filteredCharts, currentPage, limit]);

  const handleTabChange = (next: TabFilter) => {
    setTab(next);
    setPage(1);
    updateUrl({ tab: next, search, page: 1, limit });
  };

  const handleToggle = async (chart: SizeChart) => {
    setActionId(chart._id);
    try {
      await toggleSizeChart(chart._id, !chart.isActive);
      await queryClient.invalidateQueries({ queryKey: ["size-charts"] });
      await queryClient.invalidateQueries({ queryKey: ["size-charts-active"] });
      toast.success(chart.isActive ? "Size chart deactivated." : "Size chart activated.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update status."));
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async () => {
    if (!chartToDelete) return;
    setActionId(chartToDelete._id);
    try {
      await deleteSizeChart(chartToDelete._id);
      await queryClient.invalidateQueries({ queryKey: ["size-charts"] });
      await queryClient.invalidateQueries({ queryKey: ["size-charts-active"] });
      toast.success("Size chart deleted. Linked products were unlinked.");
      setChartToDelete(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete size chart."));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="mx-auto w-full px-4 py-6 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Size charts</h1>
          <p className="text-sm text-gray-500">
            Reusable measurement tables for products.
          </p>
        </div>
        <Link
          href="/size-charts/add-size-chart"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          <Plus className="size-4" />
          Create chart
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["all", "active", "inactive"] as TabFilter[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => handleTabChange(value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${
              tab === value
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {value}
          </button>
        ))}
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
            updateUrl({ tab, search: event.target.value, page: 1, limit });
          }}
          placeholder="Search name or slug..."
          className="ml-auto min-w-[200px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900 md:max-w-xs"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Unit</th>
              <th className="px-4 py-3 font-medium">Rows</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                  Loading size charts...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-red-600">
                  Failed to load size charts.
                </td>
              </tr>
            ) : charts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                  No size charts found.
                </td>
              </tr>
            ) : (
              charts.map((chart) => (
                <tr key={chart._id} className="hover:bg-gray-50/70">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {getSizeChartDisplayName(chart)}
                    </p>
                    {chart.name.ar && (
                      <p className="text-xs text-gray-500" dir="rtl">
                        {chart.name.ar}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{chart.slug}</td>
                  <td className="px-4 py-3 text-gray-700">{chart.unit}</td>
                  <td className="px-4 py-3 text-gray-700">{chart.rows.length}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        chart.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {chart.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(chart.updatedAt ?? chart.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/size-charts/edit-size-chart?id=${chart._id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleToggle(chart)}
                        disabled={actionId === chart._id}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <Power className="size-3.5" />
                        {chart.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartToDelete(chart)}
                        disabled={actionId === chart._id}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && total > 0 && (
        <TablePagination
          className="mt-4"
          page={currentPage}
          totalPages={totalPages}
          limit={limit}
          total={total}
          onPageChange={(next) => {
            setPage(next);
            updateUrl({ tab, search, page: next, limit });
          }}
        />
      )}

      {chartToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Delete size chart?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Delete &quot;{getSizeChartDisplayName(chartToDelete)}&quot;? Products using this
              chart will have their size chart link removed automatically.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setChartToDelete(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={actionId === chartToDelete._id}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
