"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import TablePagination from "@/app/components/Pagination";
import {
  ORDER_STATUS_TABS,
  OrderStatus,
  deleteOrder,
  formatEgp,
  getApiErrorMessage,
  getCustomerDisplay,
  getOrders,
  getProductTitle,
  orderStatusBadgeClass,
  paymentMethodLabel,
  paymentStatusBadgeClass,
  shippingStatusBadgeClass,
} from "@/app/lib/orderService";

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB");
}

function getItemSummary(
  items: { product: string | { title?: string }; quantity: number }[],
) {
  if (!items.length) return "-";
  const firstTitle = getProductTitle(items[0].product);
  if (items.length === 1) return firstTitle;
  return `${firstTitle} +${items.length - 1}`;
}

function OrdersTableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={`order-skeleton-${index}`} className="animate-pulse">
          {Array.from({ length: 8 }).map((__, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <div className="block h-4 rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>(
    (searchParams.get("status") as OrderStatus | null) ?? "all",
  );
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page") ?? 1)));
  const [limit, setLimit] = useState(Math.max(1, Number(searchParams.get("limit") ?? 20)));

  const updateUrl = useCallback(
    (next: { status: "all" | OrderStatus; page: number; limit: number }) => {
      const params = new URLSearchParams();
      if (next.status !== "all") params.set("status", next.status);
      if (next.page > 1) params.set("page", String(next.page));
      if (next.limit !== 20) params.set("limit", String(next.limit));
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router],
  );

  useEffect(() => {
    updateUrl({ status: statusFilter, page, limit });
  }, [limit, page, statusFilter, updateUrl]);

  const {
    data: ordersResult,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["orders", statusFilter, page, limit],
    queryFn: () =>
      getOrders({
        page,
        limit,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
  });

  const orders = useMemo(() => ordersResult?.orders ?? [], [ordersResult?.orders]);
  const pagination = ordersResult?.pagination;
  const totalPages = Math.max(1, pagination?.pages ?? 1);
  const total = pagination?.total ?? 0;
  const errorMessage = error ? getApiErrorMessage(error, "Failed to fetch orders.") : "";

  const handleDelete = async (orderId: string, orderNumber: string) => {
    const confirmed = window.confirm(
      `Delete order ${orderNumber}? Stock will be restored and this cannot be undone.`,
    );
    if (!confirmed) return;
    setDeletingId(orderId);
    try {
      await deleteOrder(orderId);
      toast.success("Order deleted.");
      await refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete order."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto w-full px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500">
          Manage orders, payment, shipping, and fulfillment.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {ORDER_STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === tab.value
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">
          {isLoading ? "Loading..." : `${total} order${total === 1 ? "" : "s"} total`}
        </p>
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
              <th className="px-4 py-3 font-medium">Order #</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Shipping</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <OrdersTableSkeleton />
            ) : errorMessage ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-red-600">
                  {errorMessage}
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <p className="text-sm text-gray-700">No orders found.</p>
                  <p className="mt-1 text-xs text-gray-500">Try another status filter.</p>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const customer = getCustomerDisplay(order);
                const itemQty = order.items.reduce(
                  (sum, item) => sum + Number(item.quantity || 0),
                  0,
                );
                return (
                  <tr key={order._id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <p>{customer.name}</p>
                      <p className="text-xs text-gray-500">{customer.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <p>{getItemSummary(order.items)}</p>
                      <p className="text-xs text-gray-500">Qty: {itemQty}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatEgp(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{paymentMethodLabel(order.paymentMethod)}</p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${paymentStatusBadgeClass(order.paymentStatus)}`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${orderStatusBadgeClass(order.orderStatus)}`}
                      >
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${shippingStatusBadgeClass(order.shippingStatus)}`}
                      >
                        {order.shippingStatus}
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
                        <button
                          type="button"
                          onClick={() => handleDelete(order._id, order.orderNumber)}
                          disabled={deletingId === order._id}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" />
                          {deletingId === order._id ? "Deleting..." : "Delete"}
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

      {!isLoading && !errorMessage && orders.length > 0 && (
        <TablePagination
          className="mt-4"
          page={Math.min(page, totalPages)}
          totalPages={totalPages}
          total={pagination?.total}
          limit={limit}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
