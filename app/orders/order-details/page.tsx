"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OrderItemUpdate,
  OrderUpdateBody,
  computeItemsSubtotal,
  deleteOrder,
  getApiErrorMessage,
  getOrderById,
  roundOrderMoney,
  updateOrder,
} from "@/app/lib/orderService";
import {
  buildOrderVariantKey,
  createOrderItemUpdate,
  getColorsForSize,
  getDefaultVariant,
  orderItemsMatch,
  orderItemsToUpdatePayload,
  serializeOrderItemsForUpdate,
} from "@/app/lib/orderItemHelpers";
import { getColors } from "@/app/lib/colorService";
import {
  ProductEntity,
  ProductSize,
  useProductStore,
} from "@/app/store/productStore";
import OrderDetailsSkeleton from "./components/OrderDetailsSkeleton";
import {
  AddressSection,
  AdminUpdatePanel,
  CustomerSection,
  EditableOrderItemsSection,
  OrderDetailHeader,
  OrderItemsSection,
  OrderSummaryCard,
  PaymentSection,
  ShippingSection,
} from "./components/OrderDetailUI";

function applyVariantToItem(
  item: OrderItemUpdate,
  product: ProductEntity,
  size: string,
  colorId: string,
  dropLineId = false,
): OrderItemUpdate {
  const variant = buildOrderVariantKey(size, colorId);
  const variantChanged =
    item.variant !== variant || item.product !== product._id;
  const price = variantChanged ? product.finalPrice : item.price;

  return {
    ...item,
    _id: dropLineId ? undefined : item._id,
    product: product._id,
    size,
    color: colorId,
    variant,
    price,
    totalPrice: roundOrderMoney(price * item.quantity),
  };
}

export default function OrderDetailsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");

  const products = useProductStore((state) => state.products);
  const fetchProducts = useProductStore((state) => state.fetchProducts);

  const [form, setForm] = useState<
    Pick<OrderUpdateBody, "orderStatus" | "paymentStatus" | "shippingStatus">
  >({
    orderStatus: "pending",
    paymentStatus: "pending",
    shippingStatus: "pending",
  });
  const [editItems, setEditItems] = useState<OrderItemUpdate[]>([]);
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

  const { data: colors = [] } = useQuery({
    queryKey: ["palette-colors"],
    queryFn: getColors,
  });

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const productMap = useMemo(() => {
    const map: Record<string, ProductEntity> = {};
    for (const product of products) {
      map[product._id] = product;
    }
    return map;
  }, [products]);

  useEffect(() => {
    if (!order) return;
    setForm({
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      shippingStatus: order.shippingStatus,
    });
    setEditItems(orderItemsToUpdatePayload(order.items));
  }, [order]);

  const canEditItems = order?.paymentMethod === "cash_on_delivery";

  const itemQty = useMemo(() => {
    const source = canEditItems ? editItems : order?.items ?? [];
    return source.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [canEditItems, editItems, order?.items]);

  const previewSubtotal = useMemo(
    () => (canEditItems ? computeItemsSubtotal(editItems) : 0),
    [canEditItems, editItems],
  );

  const previewTotal = useMemo(() => {
    if (!order || !canEditItems) return undefined;
    const subtotalChanged =
      roundOrderMoney(previewSubtotal) !== roundOrderMoney(order.subtotal);
    if (!subtotalChanged) return undefined;

    let discountAmount = order.discountAmount;
    const coupon =
      order.appliedCoupon && typeof order.appliedCoupon === "object"
        ? order.appliedCoupon
        : null;
    if (coupon?.type === "percent" && coupon.value != null) {
      discountAmount = Math.min(
        previewSubtotal,
        roundOrderMoney((previewSubtotal * coupon.value) / 100),
      );
    }

    return roundOrderMoney(
      previewSubtotal + order.shippingFee - discountAmount,
    );
  }, [order, previewSubtotal]);

  const itemsDirty = useMemo(() => {
    if (!order || !canEditItems) return false;
    return !orderItemsMatch(editItems, orderItemsToUpdatePayload(order.items));
  }, [order, editItems, canEditItems]);

  const updateItemAt = (
    index: number,
    updater: (item: OrderItemUpdate) => OrderItemUpdate,
  ) => {
    setEditItems((prev) =>
      prev.map((item, i) => (i === index ? updater(item) : item)),
    );
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = productMap[productId];
    if (!product) {
      toast.error("Product not found.");
      return;
    }
    updateItemAt(index, (item) => {
      const { size, colorId } = getDefaultVariant(product);
      return applyVariantToItem(item, product, size, colorId, true);
    });
  };

  const handleSizeChange = (index: number, size: ProductSize) => {
    const item = editItems[index];
    const product = productMap[item.product];
    if (!product) return;

    const colorsForSize = getColorsForSize(product, size);
    const nextColor = colorsForSize.includes(item.color)
      ? item.color
      : (colorsForSize[0] ?? item.color);

    updateItemAt(index, (current) =>
      applyVariantToItem(current, product, size, nextColor),
    );
  };

  const handleColorChange = (index: number, colorId: string) => {
    const item = editItems[index];
    const product = productMap[item.product];
    if (!product) return;
    updateItemAt(index, (current) =>
      applyVariantToItem(current, product, current.size, colorId),
    );
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    updateItemAt(index, (item) => ({
      ...item,
      quantity,
      totalPrice: roundOrderMoney(item.price * quantity),
    }));
  };

  const handleRemoveItem = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    const product = products[0];
    if (!product) {
      toast.error("No products available to add.");
      return;
    }
    setEditItems((prev) => [...prev, createOrderItemUpdate(product)]);
  };

  const handleSave = async () => {
    if (!orderId) return;
    if (canEditItems && editItems.length === 0) {
      toast.error("Order must have at least one item.");
      return;
    }
    setIsSaving(true);
    try {
      const { order: updated, message, turboEdit } = await updateOrder(orderId, {
        orderStatus: form.orderStatus,
        paymentStatus: form.paymentStatus,
        shippingStatus: form.shippingStatus,
        ...(canEditItems && itemsDirty
          ? { items: serializeOrderItemsForUpdate(editItems) }
          : {}),
      });
      queryClient.setQueryData(["order", orderId], updated);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["order", orderId] });

      if (turboEdit?.attempted && turboEdit.ok === false) {
        toast.warning(
          turboEdit.error ||
            message ||
            "Order saved, but Turbo shipment was not updated.",
        );
      } else if (message?.includes("Turbo shipment sync failed")) {
        toast.warning(message);
      } else {
        toast.success(message || "Order updated successfully.");
      }
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
          {getApiErrorMessage(
            error,
            "This order may have been removed or you lack access.",
          )}
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
      <OrderDetailHeader
        order={order}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {canEditItems ? (
            <EditableOrderItemsSection
              products={products}
              colors={colors}
              productMap={productMap}
              editItems={editItems}
              onProductChange={handleProductChange}
              onSizeChange={handleSizeChange}
              onColorChange={handleColorChange}
              onQuantityChange={handleQuantityChange}
              onRemoveItem={handleRemoveItem}
              onAddItem={handleAddItem}
            />
          ) : (
            <>
              <OrderItemsSection items={order.items} colors={colors} />
              <p className="-mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Line items cannot be edited for Paymob orders. Only cash on delivery orders
                support item changes.
              </p>
            </>
          )}

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
          <OrderSummaryCard
            order={order}
            itemQty={itemQty}
            previewSubtotal={previewTotal != null ? previewSubtotal : undefined}
            previewTotal={previewTotal}
          />
          <AdminUpdatePanel
            order={order}
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
