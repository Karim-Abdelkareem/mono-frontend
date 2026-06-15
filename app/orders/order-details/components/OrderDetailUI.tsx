"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  ChevronRight,
  CreditCard,
  MapPin,
  MessageSquare,
  Minus,
  Package,
  Plus,
  Save,
  Tag,
  Trash2,
  Truck,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Order,
  OrderItem,
  OrderItemUpdate,
  OrderStatus,
  OrderUpdateBody,
  PaymentStatus,
  ShippingStatus,
  computeItemsSubtotal,
  formatEgp,
  getCustomerDisplay,
  getProductImage,
  getProductTitle,
  parseVariant,
  orderStatusBadgeClass,
  paymentMethodLabel,
  paymentStatusBadgeClass,
  roundOrderMoney,
  shippingStatusBadgeClass,
} from "@/app/lib/orderService";
import {
  getColorLabel,
  getColorsForSize,
  getProductImageForVariant,
  getProductLabel,
  getSizesForProduct,
  getVariantStock,
} from "@/app/lib/orderItemHelpers";
import { getColorDisplayName } from "@/app/lib/colorService";
import { PaletteColor } from "@/app/lib/types/color";
import { ProductEntity, ProductSize } from "@/app/store/productStore";

export function formatDateTime(value?: string) {
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

export function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

type DetailSectionProps = {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function DetailSection({
  icon: Icon,
  title,
  children,
  className = "",
}: DetailSectionProps) {
  return (
    <section
      className={`rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
          <Icon className="size-4" strokeWidth={2} />
        </span>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm first:pt-0 last:pb-0">
      <span className="shrink-0 text-gray-500">{label}</span>
      <span
        className={`text-right font-medium text-gray-900 ${mono ? "font-mono text-xs break-all" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function StatusPill({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize ${className}`}
    >
      {formatStatusLabel(label)}
    </span>
  );
}

export function OrderDetailHeader({
  order,
  onDelete,
  isDeleting,
}: {
  order: Order;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <header className="mb-6 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white px-5 py-4 md:px-6">
        <nav className="mb-4 flex items-center gap-1 text-sm text-gray-500">
          <Link
            href="/orders"
            className="transition-colors hover:text-gray-900"
          >
            Orders
          </Link>
          <ChevronRight className="size-3.5 shrink-0" />
          <span className="truncate font-medium text-gray-900">
            {order.orderNumber}
          </span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Order
            </p>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-gray-900 md:text-3xl">
              {order.orderNumber}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              Placed {formatDateTime(order.createdAt)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill
                label={order.orderStatus}
                className={orderStatusBadgeClass(order.orderStatus)}
              />
              <StatusPill
                label={order.paymentStatus}
                className={paymentStatusBadgeClass(order.paymentStatus)}
              />
              <StatusPill
                label={order.shippingStatus}
                className={shippingStatusBadgeClass(order.shippingStatus)}
              />
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">
            <div className="rounded-xl bg-gray-900 px-4 py-3 text-right text-white">
              <p className="text-xs font-medium text-gray-300">Total</p>
              <p className="text-xl font-semibold tabular-nums">
                {formatEgp(order.totalAmount)}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/orders"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                <ArrowLeft className="size-4" />
                Back
              </Link>
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 className="size-4" />
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

const compactSelectClass =
  "rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10";

export function EditableOrderItemsSection({
  products,
  colors,
  productMap,
  editItems,
  onProductChange,
  onSizeChange,
  onColorChange,
  onQuantityChange,
  onRemoveItem,
  onAddItem,
}: {
  products: ProductEntity[];
  colors: PaletteColor[];
  productMap: Record<string, ProductEntity>;
  editItems: OrderItemUpdate[];
  onProductChange: (index: number, productId: string) => void;
  onSizeChange: (index: number, size: ProductSize) => void;
  onColorChange: (index: number, colorId: string) => void;
  onQuantityChange: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  onAddItem: () => void;
}) {
  return (
    <DetailSection icon={Package} title={`Line items (${editItems.length})`}>
      {editItems.length === 0 ? (
        <p className="text-sm text-amber-700">
          Add at least one item before saving.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {editItems.map((editItem, index) => (
            <EditableOrderLineItem
              key={`${index}-${editItem.product}-${editItem.variant}`}
              products={products}
              colors={colors}
              product={productMap[editItem.product]}
              fallbackItem={undefined}
              editItem={editItem}
              onProductChange={(productId) => onProductChange(index, productId)}
              onSizeChange={(size) => onSizeChange(index, size)}
              onColorChange={(colorId) => onColorChange(index, colorId)}
              onQuantityChange={(quantity) => onQuantityChange(index, quantity)}
              onRemove={() => onRemoveItem(index)}
            />
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onAddItem}
          disabled={!products.length}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-100 disabled:opacity-50"
        >
          <Plus className="size-4" />
          Add item
        </button>
        <p className="text-xs text-gray-500">
          Subtotal preview: {formatEgp(computeItemsSubtotal(editItems))}
        </p>
      </div>
    </DetailSection>
  );
}

function EditableOrderLineItem({
  products,
  colors,
  product,
  fallbackItem,
  editItem,
  onProductChange,
  onSizeChange,
  onColorChange,
  onQuantityChange,
  onRemove,
}: {
  products: ProductEntity[];
  colors: PaletteColor[];
  product?: ProductEntity;
  fallbackItem?: OrderItem;
  editItem: OrderItemUpdate;
  onProductChange: (productId: string) => void;
  onSizeChange: (size: ProductSize) => void;
  onColorChange: (colorId: string) => void;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  const sizes = getSizesForProduct(product);
  const baseColorOptions = getColorsForSize(product, editItem.size);
  const colorOptions =
    editItem.color && !baseColorOptions.includes(editItem.color)
      ? [editItem.color, ...baseColorOptions]
      : baseColorOptions;
  const sizeOptions =
    editItem.size && !sizes.includes(editItem.size as ProductSize)
      ? [editItem.size as ProductSize, ...sizes]
      : sizes;
  const stock = getVariantStock(product, editItem.size, editItem.color);
  const imageUrl =
    getProductImageForVariant(product, editItem.color) ||
    (fallbackItem ? getProductImage(fallbackItem.product) : null);
  const title = product
    ? getProductLabel(product)
    : getProductTitle(fallbackItem?.product);
  const lineTotal = roundOrderMoney(editItem.price * editItem.quantity);

  return (
    <li className="flex gap-4 py-4 first:pt-0 last:pb-0">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <Package className="size-6" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-medium text-gray-900">{title}</p>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
          >
            <Trash2 className="size-3.5" />
            Remove
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Product
            </span>
            <select
              value={editItem.product}
              onChange={(e) => onProductChange(e.target.value)}
              className={`${compactSelectClass} w-full`}
            >
              {products.map((entry) => (
                <option key={entry._id} value={entry._id}>
                  {getProductLabel(entry)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Size
            </span>
            <select
              value={editItem.size}
              onChange={(e) => onSizeChange(e.target.value as ProductSize)}
              className={`${compactSelectClass} w-full`}
              disabled={!sizeOptions.length}
            >
              {sizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Color
            </span>
            <select
              value={editItem.color}
              onChange={(e) => onColorChange(e.target.value)}
              className={`${compactSelectClass} w-full`}
              disabled={!colorOptions.length}
            >
              {colorOptions.map((colorId) => {
                const paletteEntry = colors.find(
                  (entry) => entry._id === colorId,
                );
                return (
                  <option key={colorId} value={colorId}>
                    {paletteEntry
                      ? getColorDisplayName(paletteEntry)
                      : getColorLabel(colorId, colors)}
                  </option>
                );
              })}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
            title={editItem.color}
          >
            <span
              className="size-3 rounded-full border border-gray-200"
              style={{
                backgroundColor:
                  colors.find((entry) => entry._id === editItem.color)
                    ?.hexCode ?? "#d1d5db",
              }}
            />
            {getColorLabel(editItem.color, colors)}
          </span>
          <span className="text-xs text-gray-500">
            Stock: {stock}
            {stock < editItem.quantity ? (
              <span className="ml-1 font-medium text-amber-700">
                (may fail on save)
              </span>
            ) : null}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Qty</span>
          <div className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() =>
                onQuantityChange(Math.max(1, editItem.quantity - 1))
              }
              disabled={editItem.quantity <= 1}
              className="inline-flex size-8 items-center justify-center rounded-l-xl text-gray-600 transition hover:bg-gray-100 disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <Minus className="size-3.5" />
            </button>
            <input
              type="number"
              min={1}
              value={editItem.quantity}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (Number.isFinite(next) && next >= 1)
                  onQuantityChange(Math.floor(next));
              }}
              className="w-12 border-x border-gray-200 bg-white py-1.5 text-center text-sm tabular-nums text-gray-900 outline-none"
            />
            <button
              type="button"
              onClick={() => onQuantityChange(editItem.quantity + 1)}
              className="inline-flex size-8 items-center justify-center rounded-r-xl text-gray-600 transition hover:bg-gray-100"
              aria-label="Increase quantity"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm text-gray-500">
          {formatEgp(editItem.price)} each
        </p>
        <p className="mt-0.5 font-semibold tabular-nums text-gray-900">
          {formatEgp(lineTotal)}
        </p>
      </div>
    </li>
  );
}

export function OrderItemsSection({
  items,
  colors = [],
}: {
  items: OrderItem[];
  colors?: PaletteColor[];
}) {
  return (
    <DetailSection icon={Package} title={`Line items (${items.length})`}>
      <ul className="divide-y divide-gray-100">
        {items.map((item, index) => (
          <OrderLineItem
            key={item._id ?? `${item.variant}-${index}`}
            item={item}
            colors={colors}
          />
        ))}
      </ul>
    </DetailSection>
  );
}

function OrderLineItem({
  item,
  colors = [],
}: {
  item: OrderItem;
  colors?: PaletteColor[];
}) {
  const { size, color } = parseVariant(item.variant);
  const colorLabel = getColorLabel(color, colors);
  const image = getProductImage(item.product);
  const title = getProductTitle(item.product);

  return (
    <li className="flex gap-4 py-4 first:pt-0 last:pb-0">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <Package className="size-6" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900">{title}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            Size {size}
          </span>
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {colorLabel}
          </span>
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            Qty {item.quantity}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm text-gray-500">{formatEgp(item.price)} each</p>
        <p className="mt-0.5 font-semibold tabular-nums text-gray-900">
          {formatEgp(item.totalPrice)}
        </p>
      </div>
    </li>
  );
}

export function CustomerSection({ order }: { order: Order }) {
  const customer = getCustomerDisplay(order);

  return (
    <DetailSection icon={User} title="Customer">
      <div className="space-y-1">
        <p className="text-base font-medium text-gray-900">{customer.name}</p>
        <p className="text-sm text-gray-600">{customer.email}</p>
        <p className="text-sm text-gray-600">{customer.phone}</p>
        {customer.isGuest ? (
          <span className="mt-2 inline-flex rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200/60">
            Guest checkout
          </span>
        ) : null}
      </div>
      {order.notes ? (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/50 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-amber-900">
            <MessageSquare className="size-3.5" />
            Customer note
          </div>
          <p className="text-sm text-amber-950/90">{order.notes}</p>
        </div>
      ) : null}
    </DetailSection>
  );
}

export function AddressSection({ order }: { order: Order }) {
  const addr = order.shippingAddress;
  const location = [addr.area, addr.city, addr.governorate]
    .filter(Boolean)
    .join(", ");

  return (
    <DetailSection icon={MapPin} title="Shipping address">
      <address className="not-italic">
        <p className="font-medium text-gray-900">{addr.fullName}</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {addr.addressLine1}
          {addr.addressLine2 ? (
            <>
              <br />
              {addr.addressLine2}
            </>
          ) : null}
        </p>
        {location ? (
          <p className="mt-1 text-sm text-gray-600">{location}</p>
        ) : null}
        {addr.landmark ? (
          <p className="mt-2 text-xs text-gray-500">
            Landmark: {addr.landmark}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
          <a
            href={`tel:${addr.phone1}`}
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
          >
            {addr.phone1}
          </a>
          {addr.phone2 ? (
            <a
              href={`tel:${addr.phone2}`}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
            >
              {addr.phone2}
            </a>
          ) : null}
        </div>
      </address>
    </DetailSection>
  );
}

export function PaymentSection({ order }: { order: Order }) {
  return (
    <DetailSection icon={CreditCard} title="Payment">
      <div className="divide-y divide-gray-100">
        <InfoRow
          label="Method"
          value={paymentMethodLabel(order.paymentMethod)}
        />
        <InfoRow
          label="Status"
          value={
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${paymentStatusBadgeClass(order.paymentStatus)}`}
            >
              {formatStatusLabel(order.paymentStatus)}
            </span>
          }
        />
        {order.paidAmount !== undefined ? (
          <InfoRow label="Paid" value={formatEgp(order.paidAmount)} />
        ) : null}
        {order.codAmount !== undefined && order.codAmount > 0 ? (
          <InfoRow label="COD due" value={formatEgp(order.codAmount)} />
        ) : null}
      </div>
    </DetailSection>
  );
}

export function ShippingSection({ order }: { order: Order }) {
  return (
    <DetailSection icon={Truck} title="Fulfillment">
      <div className="divide-y divide-gray-100">
        <InfoRow label="Carrier" value={order.shippingCompany || "Turbo"} />
        <InfoRow
          label="Status"
          value={
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${shippingStatusBadgeClass(order.shippingStatus)}`}
            >
              {formatStatusLabel(order.shippingStatus)}
            </span>
          }
        />
        {order.trackingNumber ? (
          <InfoRow label="Tracking" value={order.trackingNumber} mono />
        ) : null}
        {order.turboShipmentId ? (
          <InfoRow label="Turbo ID" value={order.turboShipmentId} mono />
        ) : null}
      </div>
    </DetailSection>
  );
}

export function OrderSummaryCard({
  order,
  itemQty,
  previewSubtotal,
  previewTotal,
}: {
  order: Order;
  itemQty: number;
  previewSubtotal?: number;
  previewTotal?: number;
}) {
  const coupon =
    order.appliedCoupon && typeof order.appliedCoupon === "object"
      ? order.appliedCoupon
      : null;

  const subtotal = previewSubtotal ?? order.subtotal;
  const totalAmount = previewTotal ?? order.totalAmount;
  const hasPreview =
    previewSubtotal != null &&
    roundOrderMoney(previewSubtotal) !== roundOrderMoney(order.subtotal);

  return (
    <DetailSection icon={Banknote} title="Order summary">
      {hasPreview ? (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Totals below reflect unsaved item changes. Save to apply.
        </p>
      ) : null}
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <dt>Subtotal</dt>
          <dd className="tabular-nums font-medium text-gray-900">
            {formatEgp(subtotal)}
          </dd>
        </div>
        <div className="flex justify-between text-gray-600">
          <dt>Shipping</dt>
          <dd className="tabular-nums font-medium text-gray-900">
            {formatEgp(order.shippingFee)}
          </dd>
        </div>
        {order.discountAmount > 0 ? (
          <div className="flex justify-between text-emerald-700">
            <dt className="flex items-center gap-1">
              <Tag className="size-3.5" />
              Discount
            </dt>
            <dd className="tabular-nums font-medium">
              −{formatEgp(order.discountAmount)}
            </dd>
          </div>
        ) : (
          <div className="flex justify-between text-gray-600">
            <dt>Discount</dt>
            <dd className="tabular-nums text-gray-500">{formatEgp(0)}</dd>
          </div>
        )}
        <div className="border-t border-dashed border-gray-200 pt-3">
          <div className="flex justify-between">
            <dt className="font-semibold text-gray-900">Total</dt>
            <dd className="text-lg font-semibold tabular-nums text-gray-900">
              {formatEgp(totalAmount)}
            </dd>
          </div>
        </div>
        <p className="pt-1 text-xs text-gray-500">
          {itemQty} item{itemQty === 1 ? "" : "s"}
        </p>
      </dl>
      {coupon ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 ring-1 ring-violet-100">
          <Tag className="size-4 text-violet-600" />
          <div>
            <p className="text-xs font-medium text-violet-900">{coupon.code}</p>
            {coupon.type && coupon.value !== undefined ? (
              <p className="text-xs text-violet-700">
                {coupon.type}: {coupon.value}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </DetailSection>
  );
}

const orderStatusOptions: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const paymentStatusOptions: PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "refunded",
];

const shippingStatusOptions: ShippingStatus[] = [
  "pending",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "returned",
  "cancelled",
];

const selectClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900/10";

const readOnlyClass =
  "w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700";

export function AdminUpdatePanel({
  order,
  form,
  setForm,
  onSave,
  isSaving,
  updatedAt,
}: {
  order: Order;
  form: Pick<OrderUpdateBody, "orderStatus" | "paymentStatus" | "shippingStatus">;
  setForm: React.Dispatch<
    React.SetStateAction<
      Pick<OrderUpdateBody, "orderStatus" | "paymentStatus" | "shippingStatus">
    >
  >;
  onSave: () => void;
  isSaving: boolean;
  updatedAt?: string;
}) {
  return (
    <section className="sticky top-6 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Update order</h2>
        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600">
          Admin
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500">
            Order status
          </label>
          <select
            value={form.orderStatus}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                orderStatus: e.target.value as OrderStatus,
              }))
            }
            className={selectClass}
          >
            {orderStatusOptions.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">
              Payment status
            </label>
            <select
              value={form.paymentStatus}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  paymentStatus: e.target.value as PaymentStatus,
                }))
              }
              className={selectClass}
            >
              {paymentStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">
              Shipping status
            </label>
            <select
              value={form.shippingStatus}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  shippingStatus: e.target.value as ShippingStatus,
                }))
              }
              className={selectClass}
            >
              {shippingStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500">
            Tracking number
          </label>
          <p className={`${readOnlyClass} font-mono text-xs break-all`}>
            {order.trackingNumber || "—"}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500">
            Turbo shipment ID
          </label>
          <p className={`${readOnlyClass} font-mono text-xs break-all`}>
            {order.turboShipmentId || "—"}
          </p>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-black disabled:opacity-50"
        >
          <Save className="size-4" />
          {isSaving ? "Saving…" : "Save changes"}
        </button>

        <p className="text-center text-xs text-gray-500">
          Last updated {formatDateTime(updatedAt)}
        </p>
      </div>
    </section>
  );
}
