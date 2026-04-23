"use client";

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

const revenueData = [
  { month: "Jan", revenue: 12000 },
  { month: "Feb", revenue: 15800 },
  { month: "Mar", revenue: 14300 },
  { month: "Apr", revenue: 19200 },
  { month: "May", revenue: 22400 },
  { month: "Jun", revenue: 24800 },
];

const orderData = [
  { month: "Jan", paidItems: 78, products: 95 },
  { month: "Feb", paidItems: 102, products: 118 },
  { month: "Mar", paidItems: 95, products: 110 },
  { month: "Apr", paidItems: 127, products: 146 },
  { month: "May", paidItems: 140, products: 159 },
  { month: "Jun", paidItems: 168, products: 190 },
];

const categorySalesData = [
  { name: "T-Shirts", value: 320 },
  { name: "Jeans", value: 240 },
  { name: "Hoodies", value: 180 },
  { name: "Jackets", value: 120 },
];

const sizeDemandData = [
  { size: "XS", orders: 30 },
  { size: "S", orders: 78 },
  { size: "M", orders: 132 },
  { size: "L", orders: 118 },
  { size: "XL", orders: 72 },
];

const weeklyOrdersData = [
  { week: "W1", orders: 62 },
  { week: "W2", orders: 71 },
  { week: "W3", orders: 66 },
  { week: "W4", orders: 84 },
  { week: "W5", orders: 89 },
  { week: "W6", orders: 94 },
];

const categoryColors = ["#111827", "#4b5563", "#6b7280", "#9ca3af"];

const cardClassName =
  "rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md";

export default function Home() {
  return (
    <section className="min-h-full bg-gray-50 p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Revenue, paid items, and product performance overview.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          <div className={cardClassName}>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">$110,500</p>
          </div>
          <div className={cardClassName}>
            <p className="text-sm text-gray-500">Paid Items</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">710</p>
          </div>
          <div className={cardClassName}>
            <p className="text-sm text-gray-500">Products</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">818</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <article className={cardClassName}>
            <h2 className="mb-1 text-base font-semibold text-gray-900">Revenue</h2>
            <p className="mb-4 text-sm text-gray-500">Monthly revenue trend</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" tickFormatter={(value) => `$${value / 1000}k`} />
                  <Tooltip
                    formatter={(value) => {
                      const numericValue =
                        typeof value === "number" ? value : Number(value ?? 0);
                      return [`$${numericValue.toLocaleString()}`, "Revenue"];
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
            </div>
          </article>

          <article className={cardClassName}>
            <h2 className="mb-1 text-base font-semibold text-gray-900">
              Paid Items & Products
            </h2>
            <p className="mb-4 text-sm text-gray-500">Monthly order and catalog activity</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orderData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
                  <Bar dataKey="paidItems" fill="#111827" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="products" fill="#9ca3af" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <article className={cardClassName}>
            <h2 className="mb-1 text-base font-semibold text-gray-900">Category Sales Mix</h2>
            <p className="mb-4 text-sm text-gray-500">Share of sold items by clothing type</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySalesData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {categorySalesData.map((entry, index) => (
                      <Cell
                        key={`${entry.name}-${index}`}
                        fill={categoryColors[index % categoryColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className={cardClassName}>
            <h2 className="mb-1 text-base font-semibold text-gray-900">Size Demand</h2>
            <p className="mb-4 text-sm text-gray-500">Most ordered sizes this period</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sizeDemandData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="size" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
                  <Bar dataKey="orders" fill="#111827" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className={cardClassName}>
            <h2 className="mb-1 text-base font-semibold text-gray-900">Weekly Orders</h2>
            <p className="mb-4 text-sm text-gray-500">Order growth over recent weeks</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyOrdersData}>
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
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
