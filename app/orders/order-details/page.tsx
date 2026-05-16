"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OrderUpdateBody,
  deleteOrder,
  getApiErrorMessage,
  getOrderById,
  updateOrder,
} from "@/app/lib/orderService";
import OrderDetailsSkeleton from "./components/OrderDetailsSkeleton";
import {
  AddressSection,
  AdminUpdatePanel,
  CustomerSection,
  OrderDetailHeader,
  OrderItemsSection,
  OrderSummaryCard,
  PaymentSection,
  ShippingSection,
} from "./components/OrderDetailUI";

export default function OrderDetailsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");

  const [form, setForm] = useState<OrderUpdateBody & { adminNotes: string }>({
    orderStatus: "pending",
    paymentStatus: "pending",
    shippingStatus: "pending",
    trackingNumber: "",
    turboShipmentId: "",
    adminNotes: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => {
      if (!orderId) return Promise.resolve(null);
      return getOrderById(orderId);
    },
    enabled: Boolean(orderId),
  });

  useEffect(() => {
    if (!order) return;
    setForm({
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      shippingStatus: order.shippingStatus,
      trackingNumber: order.trackingNumber ?? "",
      turboShipmentId: order.turboShipmentId ?? "",
      adminNotes: order.adminNotes ?? "",
    });
  }, [order]);

  const itemQty = useMemo(
    () => order?.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) ?? 0,
    [order],
  );

  const handleSave = async () => {
    if (!orderId) return;
    setIsSaving(true);
    try {
      const updated = await updateOrder(orderId, {
        orderStatus: form.orderStatus,
        paymentStatus: form.paymentStatus,
        shippingStatus: form.shippingStatus,
        trackingNumber: form.trackingNumber?.trim() || undefined,
        turboShipmentId: form.turboShipmentId?.trim() || undefined,
        adminNotes: form.adminNotes?.trim() || undefined,
      });
      queryClient.setQueryData(["order", orderId], updated);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order updated successfully.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update order."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!orderId || !order) return;
    const confirmed = window.confirm(
      `Delete order ${order.orderNumber}? Stock will be restored and this cannot be undone.`,
    );
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await deleteOrder(orderId);
      toast.success("Order deleted.");
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.replace("/orders");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete order."));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!orderId) {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center px-4 py-6 md:px-8">
        <p className="text-sm text-gray-500">Missing order id.</p>
      </div>
    );
  }

  if (isLoading) {
    return <OrderDetailsSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="flex min-h-[50vh] w-full flex-col items-center justify-center px-4 py-12 text-center md:px-8">
        <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <AlertCircle className="size-7" />
        </span>
        <h1 className="text-lg font-semibold text-gray-900">Order not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          {getApiErrorMessage(error, "This order may have been removed or you lack access.")}
        </p>
        <Link
          href="/orders"
          className="mt-6 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-black"
        >
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 md:px-8">
      <OrderDetailHeader order={order} onDelete={handleDelete} isDeleting={isDeleting} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <OrderItemsSection items={order.items} />

          <div className="grid gap-6 sm:grid-cols-2">
            <CustomerSection order={order} />
            <AddressSection order={order} />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <PaymentSection order={order} />
            <ShippingSection order={order} />
          </div>
        </div>

        <aside className="space-y-6">
          <OrderSummaryCard order={order} itemQty={itemQty} />
          <AdminUpdatePanel
            form={form}
            setForm={setForm}
            onSave={handleSave}
            isSaving={isSaving}
            updatedAt={order.updatedAt}
          />
        </aside>
      </div>
    </div>
  );
}
