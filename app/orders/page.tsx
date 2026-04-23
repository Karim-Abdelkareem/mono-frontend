"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { ArrowDownAZ, ArrowUpAZ, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";

type OrderItem = {
  _id: string;
  titleSnapshot?: { en?: string; ar?: string };
  quantity: number;
};

type OrderEntity = {
  _id: string;
  guestInfo?: {
    fullName?: string;
    email?: string;
    phone?: string;
  };
  items: OrderItem[];
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
  totalQuantity?: number;
  totalPrice?: number;
  createdAt?: string;
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB");
}

function getItemSummary(items: OrderItem[]) {
  if (!items.length) return "-";
  const firstTitle =
    items[0].titleSnapshot?.en || items[0].titleSnapshot?.ar || "Item";
  if (items.length === 1) return firstTitle;
  return `${firstTitle} +${items.length - 1}`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "total" | "quantity">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError("");
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) throw new Error("NEXT_PUBLIC_API_URL is not set.");
      const { data } = await api.get<{ data?: OrderEntity[]; orders?: OrderEntity[] }>(
        "/orders",
        { baseURL: baseUrl },
      );
      setOrders(data?.data ?? data?.orders ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch orders.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchOrders();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const customerName = (order.guestInfo?.fullName || "").toLowerCase();
      const customerPhone = (order.guestInfo?.phone || "").toLowerCase();
      const itemSummary = getItemSummary(order.items).toLowerCase();
      const matchesSearch =
        !query ||
        customerName.includes(query) ||
        customerPhone.includes(query) ||
        itemSummary.includes(query) ||
        order._id.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" || (order.orderStatus || "-") === statusFilter;
      const matchesPayment =
        paymentFilter === "all" || (order.paymentStatus || "-") === paymentFilter;
      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, search, statusFilter, paymentFilter]);

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(filteredOrders.map((order) => order.orderStatus || "-").filter(Boolean)),
      ),
    [filteredOrders],
  );

  const paymentOptions = useMemo(
    () =>
      Array.from(
        new Set(filteredOrders.map((order) => order.paymentStatus || "-").filter(Boolean)),
      ),
    [filteredOrders],
  );

  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders].sort((a, b) => {
      if (sortBy === "total") {
        return Number(a.totalPrice ?? 0) - Number(b.totalPrice ?? 0);
      }
      if (sortBy === "quantity") {
        return Number(a.totalQuantity ?? 0) - Number(b.totalQuantity ?? 0);
      }
      const aDate = new Date(a.createdAt ?? "").getTime();
      const bDate = new Date(b.createdAt ?? "").getTime();
      return aDate - bDate;
    });
    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [filteredOrders, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, currentPage, pageSize]);

  const handleDelete = async (orderId: string) => {
    const confirmed = window.confirm(
      "Delete this order? This action cannot be undone.",
    );
    if (!confirmed) return;
    setDeletingId(orderId);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) throw new Error("NEXT_PUBLIC_API_URL is not set.");
      await api.delete(`/orders/${orderId}`, { baseURL: baseUrl });
      setOrders((prev) => prev.filter((order) => order._id !== orderId));
      toast.success("Order deleted.");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message =
          (err.response?.data as { message?: string } | undefined)?.message ||
          "Failed to delete order.";
        toast.error(message);
      } else {
        toast.error("Failed to delete order.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto w-full px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500">
          Key order information with quick actions.
        </p>
      </div>

      <div className="mb-4 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-6">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search by customer, phone, item, order ID..."
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
        />
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
        >
          <option value="all">All order status</option>
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(event) => {
            setPaymentFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
        >
          <option value="all">All payment status</option>
          {paymentOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(event) => {
            setSortBy(event.target.value as "date" | "total" | "quantity");
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
        >
          <option value="date">Sort by Date</option>
          <option value="total">Sort by Total</option>
          <option value="quantity">Sort by Quantity</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
            setPage(1);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          {sortDirection === "asc" ? (
            <>
              <ArrowUpAZ className="size-4" />
              Ascending
            </>
          ) : (
            <>
              <ArrowDownAZ className="size-4" />
              Descending
            </>
          )}
        </button>
        <select
          value={String(pageSize)}
          onChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
        >
          <option value="5">5 / page</option>
          <option value="10">10 / page</option>
          <option value="20">20 / page</option>
          <option value="50">50 / page</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                  Loading orders...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-red-600">
                  {error}
                </td>
              </tr>
            ) : sortedOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                  No orders found for current filters.
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50/70">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      #{order._id.slice(-6).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <p>{order.guestInfo?.fullName || "Guest"}</p>
                    <p className="text-xs text-gray-500">{order.guestInfo?.phone || "-"}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <p>{getItemSummary(order.items)}</p>
                    <p className="text-xs text-gray-500">
                      Qty: {order.totalQuantity ?? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    ${Number(order.totalPrice ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-700">{order.paymentMethod || "-"}</span>
                    <p className="text-xs text-gray-500">{order.paymentStatus || "-"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      {order.orderStatus || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/orders/order-details?id=${order._id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="size-3.5" />
                        Details
                      </Link>
                      <Link
                        href={`/orders/edit-order?id=${order._id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(order._id)}
                        disabled={deletingId === order._id}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" />
                        {deletingId === order._id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && !error && sortedOrders.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">
          <p className="text-gray-600">
            Showing {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, sortedOrders.length)} of{" "}
            {sortedOrders.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-gray-600">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
