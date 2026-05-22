"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getApiErrorMessage,
  getDashboardStats,
} from "@/app/lib/analyticsService";
import { formatEgp } from "@/app/lib/orderService";

const categoryColors = ["#111827", "#4b5563", "#6b7280", "#9ca3af"];

const cardClassName =
  "rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md";

function formatRevenueAxis(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return String(value);
}

function ChartSkeleton({ className = "h-72" }: { className?: string }) {
  return (
    <div
      className={`w-full animate-pulse rounded-lg bg-gray-100 ${className}`}
      aria-hidden
    />
  );
}

export default function Home() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboard-analytics"],
    queryFn: () => getDashboardStats(),
    staleTime: 60_000,
  });

  const summary = data?.summary;
  const revenueByMonth = data?.revenueByMonth ?? [];
  const activityByMonth = data?.activityByMonth ?? [];
  const salesByCategory = data?.salesByCategory ?? [];
  const ordersBySize = data?.ordersBySize ?? [];
  const ordersByWeek = data?.ordersByWeek ?? [];

  const errorMessage = isError
    ? getApiErrorMessage(error, "Failed to load dashboard analytics.")
    : null;

  return (
    <section className="min-h-full bg-gray-50 p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Revenue, paid items, and product performance overview.
          </p>
        </header>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-3">
          <div className={cardClassName}>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {isLoading ? "…" : formatEgp(summary?.totalRevenue)}
            </p>
          </div>
          <div className={cardClassName}>
            <p className="text-sm text-gray-500">Paid Items</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {isLoading ? "…" : (summary?.paidItems ?? 0)}
            </p>
          </div>
          <div className={cardClassName}>
            <p className="text-sm text-gray-500">Products</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {isLoading ? "…" : (summary?.productsCount ?? 0)}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <article className={cardClassName}>
            <h2 className="mb-1 text-base font-semibold text-gray-900">Revenue</h2>
            <p className="mb-4 text-sm text-gray-500">Monthly revenue trend</p>
            <div className="h-72 w-full">
              {isLoading ? (
                <ChartSkeleton />
              ) : revenueByMonth.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-gray-500">
                  No revenue data yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis
                      stroke="#6b7280"
                      tickFormatter={(value) => formatRevenueAxis(Number(value))}
                    />
                    <Tooltip
                      formatter={(value) => {
                        const numericValue =
                          typeof value === "number" ? value : Number(value ?? 0);
                        return [formatEgp(numericValue), "Revenue"];
                      }}
                      contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#111827"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          <article className={cardClassName}>
            <h2 className="mb-1 text-base font-semibold text-gray-900">
              Paid Items & Products
            </h2>
            <p className="mb-4 text-sm text-gray-500">Monthly order and catalog activity</p>
            <div className="h-72 w-full">
              {isLoading ? (
                <ChartSkeleton />
              ) : activityByMonth.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-gray-500">
                  No activity data yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
                    <Bar dataKey="paidItems" fill="#111827" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="products" fill="#9ca3af" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <article className={cardClassName}>
            <h2 className="mb-1 text-base font-semibold text-gray-900">Category Sales Mix</h2>
            <p className="mb-4 text-sm text-gray-500">Share of sold items by clothing type</p>
            <div className="h-72 w-full">
              {isLoading ? (
                <ChartSkeleton />
              ) : salesByCategory.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-gray-500">
                  No category sales yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salesByCategory}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {salesByCategory.map((entry, index) => (
                        <Cell
                          key={`${entry.name}-${index}`}
                          fill={categoryColors[index % categoryColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          <article className={cardClassName}>
            <h2 className="mb-1 text-base font-semibold text-gray-900">Size Demand</h2>
            <p className="mb-4 text-sm text-gray-500">Most ordered sizes this period</p>
            <div className="h-72 w-full">
              {isLoading ? (
                <ChartSkeleton />
              ) : ordersBySize.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-gray-500">
                  No size data yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ordersBySize}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="size" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
                    <Bar dataKey="orders" fill="#111827" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          <article className={cardClassName}>
            <h2 className="mb-1 text-base font-semibold text-gray-900">Weekly Orders</h2>
            <p className="mb-4 text-sm text-gray-500">Order growth over recent weeks</p>
            <div className="h-72 w-full">
              {isLoading ? (
                <ChartSkeleton />
              ) : ordersByWeek.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-gray-500">
                  No weekly orders yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ordersByWeek}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="week" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      stroke="#111827"
                      fill="#d1d5db"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
