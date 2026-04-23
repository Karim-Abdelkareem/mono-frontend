"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/app/lib/api";

type OrderItem = {
  _id: string;
  product?: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  titleSnapshot?: { en?: string; ar?: string };
  imageSnapshot?: string;
};

type OrderDetails = {
  _id: string;
  guestId?: string;
  guestInfo?: {
    fullName?: string;
    email?: string;
    phone?: string;
  };
  shippingAddress?: {
    country?: string;
    city?: string;
    area?: string;
    addressLine?: string;
  };
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
  totalQuantity?: number;
  subtotal?: number;
  shippingFee?: number;
  discountAmount?: number;
  totalPrice?: number;
  items: OrderItem[];
  createdAt?: string;
  updatedAt?: string;
};

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB");
}

function currency(value?: number) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

export default function OrderDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nextOrderStatus, setNextOrderStatus] = useState("");
  const [nextPaymentStatus, setNextPaymentStatus] = useState("");
  const [isUpdatingOrderStatus, setIsUpdatingOrderStatus] = useState(false);
  const [isUpdatingPaymentStatus, setIsUpdatingPaymentStatus] = useState(false);

  const orderStatusOptions = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];
  const paymentStatusOptions = ["pending", "paid", "failed", "refunded"];

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      setIsLoading(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!baseUrl) throw new Error("NEXT_PUBLIC_API_URL is not set.");
        const { data } = await api.get<{ data?: OrderDetails; order?: OrderDetails }>(
          `/orders/${orderId}`,
          { baseURL: baseUrl },
        );
        const resolved = data?.data ?? data?.order ?? null;
        if (!resolved) {
          toast.error("Order not found.");
          router.replace("/orders");
          return;
        }
        setNextOrderStatus(resolved.orderStatus || "pending");
        setNextPaymentStatus(resolved.paymentStatus || "pending");
        setOrder(resolved);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const message =
            (error.response?.data as { message?: string } | undefined)?.message ||
            "Failed to load order details.";
          toast.error(message);
        } else {
          toast.error("Failed to load order details.");
        }
        router.replace("/orders");
      } finally {
        setIsLoading(false);
      }
    };
    void fetchOrder();
  }, [orderId, router]);

  const computedQuantity = useMemo(
    () =>
      order?.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) ?? 0,
    [order],
  );

  const handleUpdateOrderStatus = async () => {
    if (!orderId) return;
    setIsUpdatingOrderStatus(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) throw new Error("NEXT_PUBLIC_API_URL is not set.");
      await api.patch(
        `/orders/${orderId}/status`,
        { orderStatus: nextOrderStatus },
        { baseURL: baseUrl },
      );
      setOrder((prev) =>
        prev ? { ...prev, orderStatus: nextOrderStatus, updatedAt: new Date().toISOString() } : prev,
      );
      toast.success("Order status updated.");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string } | undefined)?.message ||
          "Failed to update order status.";
        toast.error(message);
      } else {
        toast.error("Failed to update order status.");
      }
    } finally {
      setIsUpdatingOrderStatus(false);
    }
  };

  const handleUpdatePaymentStatus = async () => {
    if (!orderId) return;
    setIsUpdatingPaymentStatus(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) throw new Error("NEXT_PUBLIC_API_URL is not set.");
      await api.patch(
        `/orders/${orderId}/payment-status`,
        { paymentStatus: nextPaymentStatus },
        { baseURL: baseUrl },
      );
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              paymentStatus: nextPaymentStatus,
              updatedAt: new Date().toISOString(),
            }
          : prev,
      );
      toast.success("Payment status updated.");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string } | undefined)?.message ||
          "Failed to update payment status.";
        toast.error(message);
      } else {
        toast.error("Failed to update payment status.");
      }
    } finally {
      setIsUpdatingPaymentStatus(false);
    }
  };

  if (!orderId) {
    return (
      <div className="mx-auto w-full px-4 py-6 md:px-8">
        <p className="text-sm text-gray-500">Missing order id.</p>
      </div>
    );
  }

  if (isLoading || !order) {
    return (
      <div className="mx-auto w-full px-4 py-6 md:px-8">
        <p className="text-sm text-gray-500">Loading order details...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full px-4 py-6 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Order #{order._id.slice(-6).toUpperCase()}
          </h1>
          <p className="text-sm text-gray-500">
            Created: {formatDateTime(order.createdAt)}
          </p>
        </div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="size-4" />
          Back to orders
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Items
          </h2>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Variant</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Unit</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <tr key={item._id}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="relative size-10 overflow-hidden rounded border border-gray-200 bg-gray-100">
                          {item.imageSnapshot ? (
                            <Image
                              src={item.imageSnapshot}
                              alt={item.titleSnapshot?.en || "Order item"}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : null}
                        </div>
                        <span className="text-gray-800">
                          {item.titleSnapshot?.en || item.titleSnapshot?.ar || "Item"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {item.size || "-"} / {item.color || "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{item.quantity}</td>
                    <td className="px-3 py-2 text-gray-700">{currency(item.unitPrice)}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {currency(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Customer
            </h2>
            <p className="text-sm text-gray-800">{order.guestInfo?.fullName || "Guest"}</p>
            <p className="text-xs text-gray-500">{order.guestInfo?.email || "-"}</p>
            <p className="text-xs text-gray-500">{order.guestInfo?.phone || "-"}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Shipping
            </h2>
            <p className="text-sm text-gray-800">
              {order.shippingAddress?.addressLine || "-"}
            </p>
            <p className="text-xs text-gray-500">
              {[order.shippingAddress?.area, order.shippingAddress?.city, order.shippingAddress?.country]
                .filter(Boolean)
                .join(", ") || "-"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Payment & Totals
            </h2>
            <div className="space-y-1 text-sm text-gray-700">
              <p>Method: {order.paymentMethod || "-"}</p>
              <p>Status: {order.paymentStatus || "-"}</p>
              <p>Order status: {order.orderStatus || "-"}</p>
              <p>Quantity: {order.totalQuantity ?? computedQuantity}</p>
              <p>Subtotal: {currency(order.subtotal)}</p>
              <p>Shipping fee: {currency(order.shippingFee)}</p>
              <p>Discount: {currency(order.discountAmount)}</p>
              <p className="font-semibold text-gray-900">
                Total: {currency(order.totalPrice)}
              </p>
              <p className="text-xs text-gray-500">
                Last update: {formatDateTime(order.updatedAt)}
              </p>
            </div>

            <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
              <div className="grid gap-2">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Update order status
                </label>
                <div className="flex gap-2">
                  <select
                    value={nextOrderStatus}
                    onChange={(event) => setNextOrderStatus(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
                  >
                    {orderStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleUpdateOrderStatus}
                    disabled={
                      isUpdatingOrderStatus || nextOrderStatus === (order.orderStatus || "")
                    }
                    className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUpdatingOrderStatus ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Update payment status
                </label>
                <div className="flex gap-2">
                  <select
                    value={nextPaymentStatus}
                    onChange={(event) => setNextPaymentStatus(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
                  >
                    {paymentStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleUpdatePaymentStatus}
                    disabled={
                      isUpdatingPaymentStatus ||
                      nextPaymentStatus === (order.paymentStatus || "")
                    }
                    className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUpdatingPaymentStatus ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
