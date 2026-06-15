"use client";

import axios from "axios";
import { api } from "./api";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type ShippingStatus =
  | "pending"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "returned"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod = "cash_on_delivery" | "paymob_card" | "paymob_wallet";

export type ShippingAddress = {
  fullName: string;
  phone1: string;
  phone2?: string;
  addressLine1: string;
  addressLine2?: string;
  governorate: string;
  city: string;
  area?: string;
  landmark?: string;
};

export type OrderProductRef = {
  _id?: string;
  title?: string | { en?: string; ar?: string };
  images?: string[];
  mainImage?: string;
  secondaryImage?: string;
  productImagesAndVideos?: Array<{ url?: string; type?: "image" | "video" | string }>;
  finalPrice?: number;
  basePrice?: number;
};

export type OrderItem = {
  _id?: string;
  product: string | OrderProductRef;
  quantity: number;
  price: number;
  variant: string;
  totalPrice: number;
};

export type OrderUserRef = {
  _id?: string;
  name?: string;
  email?: string;
};

export type OrderCouponRef = {
  _id?: string;
  code?: string;
  type?: string;
  value?: number;
};

export type Order = {
  _id: string;
  orderNumber: string;
  user?: string | OrderUserRef | null;
  guestEmail?: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount?: number;
  codAmount?: number;
  appliedCoupon?: string | OrderCouponRef;
  shippingAddress: ShippingAddress;
  shippingCompany?: string;
  shippingStatus: ShippingStatus;
  turboShipmentId?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymobOrderId?: string;
  paymobPaymentId?: string;
  paymobTransactionId?: string;
  orderStatus: OrderStatus;
  notes?: string;
  adminNotes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type OrderItemUpdate = {
  _id?: string;
  product: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  variant: string;
  totalPrice: number;
};

export type OrderUpdateBody = {
  orderStatus?: OrderStatus;
  shippingStatus?: ShippingStatus;
  paymentStatus?: PaymentStatus;
  trackingNumber?: string;
  turboShipmentId?: string;
  adminNotes?: string;
  items?: OrderItemUpdate[];
  shippingFee?: number;
};

export type GetOrdersParams = {
  page?: number;
  limit?: number;
  status?: OrderStatus;
};

export type OrdersPagination = {
  page: number;
  pages: number;
  total: number;
};

export type GetOrdersResult = {
  orders: Order[];
  results: number;
  pagination: OrdersPagination;
};

type OrdersListResponse = {
  results?: number;
  pagination?: Partial<OrdersPagination>;
  data?: { orders?: unknown[] };
  orders?: unknown[];
};

type OrderResponse = {
  data?: { order?: unknown } | unknown;
  order?: unknown;
  message?: string;
};

function getBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not set.");
  }
  return baseUrl;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizeProductTitle(value: unknown): string | { en?: string; ar?: string } | undefined {
  if (typeof value === "string") return value;
  const row = asRecord(value);
  if (!row) return undefined;
  const en = typeof row.en === "string" ? row.en : undefined;
  const ar = typeof row.ar === "string" ? row.ar : undefined;
  if (!en && !ar) return undefined;
  return { en, ar };
}

function normalizeProductImages(productRow: Record<string, unknown>): string[] | undefined {
  const directImages = Array.isArray(productRow.images)
    ? (productRow.images as unknown[]).filter((img): img is string => typeof img === "string")
    : [];

  const productMedia = Array.isArray(productRow.productImagesAndVideos)
    ? (productRow.productImagesAndVideos as unknown[])
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => Boolean(entry))
      .filter((entry) => entry.type === "image" && typeof entry.url === "string")
      .map((entry) => entry.url as string)
    : [];

  const mainImage = typeof productRow.mainImage === "string" ? productRow.mainImage : "";
  const secondaryImage =
    typeof productRow.secondaryImage === "string" ? productRow.secondaryImage : "";

  const merged = [...directImages, ...productMedia, mainImage, secondaryImage].filter(Boolean);
  if (!merged.length) return undefined;
  return Array.from(new Set(merged));
}

function normalizeOrder(raw: unknown): Order | null {
  const source = asRecord(raw);
  if (!source) return null;

  const orderId =
    typeof source._id === "string"
      ? source._id
      : source._id != null
        ? String(source._id)
        : null;
  if (!orderId) return null;

  const itemsRaw = Array.isArray(source.items) ? source.items : [];
  const items: OrderItem[] = [];
  for (const item of itemsRaw) {
    const row = asRecord(item);
    if (!row) continue;
    const product = row.product;
    const productRow = asRecord(product);
    const safeProductRow = productRow ?? {};
    items.push({
      _id: typeof row._id === "string" ? row._id : undefined,
      product:
        typeof product === "string"
          ? product
          : {
            _id: typeof productRow?._id === "string" ? productRow._id : undefined,
            title: normalizeProductTitle(safeProductRow.title),
            images: normalizeProductImages(safeProductRow),
            mainImage:
              typeof safeProductRow.mainImage === "string"
                ? safeProductRow.mainImage
                : undefined,
            secondaryImage:
              typeof safeProductRow.secondaryImage === "string"
                ? safeProductRow.secondaryImage
                : undefined,
            productImagesAndVideos: Array.isArray(safeProductRow.productImagesAndVideos)
              ? (safeProductRow.productImagesAndVideos as unknown[])
                .map((entry) => asRecord(entry))
                .filter((entry): entry is Record<string, unknown> => Boolean(entry))
                .map((entry) => ({
                  url: typeof entry.url === "string" ? entry.url : undefined,
                  type: typeof entry.type === "string" ? entry.type : undefined,
                }))
              : undefined,
            finalPrice: Number(productRow?.finalPrice ?? NaN) || undefined,
            basePrice: Number(productRow?.basePrice ?? NaN) || undefined,
          },
      quantity: Number(row.quantity ?? 0),
      price: Number(row.price ?? 0),
      variant: typeof row.variant === "string" ? row.variant : "",
      totalPrice: Number(row.totalPrice ?? 0),
    });
  }

  const shipping = asRecord(source.shippingAddress) ?? {};
  const user = source.user;
  let normalizedUser: Order["user"];
  if (typeof user === "string") {
    normalizedUser = user;
  } else if (user === null) {
    normalizedUser = null;
  } else {
    const userRow = asRecord(user);
    normalizedUser = userRow
      ? {
        _id:
          typeof userRow._id === "string"
            ? userRow._id
            : userRow._id != null
              ? String(userRow._id)
              : undefined,
        name: typeof userRow.name === "string" ? userRow.name : undefined,
        email: typeof userRow.email === "string" ? userRow.email : undefined,
      }
      : undefined;
  }

  const coupon = source.appliedCoupon;
  let normalizedCoupon: Order["appliedCoupon"];
  if (typeof coupon === "string") {
    normalizedCoupon = coupon;
  } else {
    const couponRow = asRecord(coupon);
    normalizedCoupon = couponRow
      ? {
        _id: typeof couponRow._id === "string" ? couponRow._id : undefined,
        code: typeof couponRow.code === "string" ? couponRow.code : undefined,
        type: typeof couponRow.type === "string" ? couponRow.type : undefined,
        value: Number(couponRow.value ?? NaN) || undefined,
      }
      : undefined;
  }

  return {
    _id: orderId,
    orderNumber: typeof source.orderNumber === "string" ? source.orderNumber : orderId,
    user: normalizedUser,
    guestEmail: typeof source.guestEmail === "string" ? source.guestEmail : undefined,
    items,
    subtotal: Number(source.subtotal ?? 0),
    shippingFee: Number(source.shippingFee ?? 0),
    discountAmount: Number(source.discountAmount ?? 0),
    totalAmount: Number(source.totalAmount ?? 0),
    paidAmount: source.paidAmount !== undefined ? Number(source.paidAmount) : undefined,
    codAmount: source.codAmount !== undefined ? Number(source.codAmount) : undefined,
    appliedCoupon: normalizedCoupon,
    shippingAddress: {
      fullName: String(shipping.fullName ?? ""),
      phone1: String(shipping.phone1 ?? ""),
      phone2: typeof shipping.phone2 === "string" ? shipping.phone2 : undefined,
      addressLine1: String(shipping.addressLine1 ?? ""),
      addressLine2: typeof shipping.addressLine2 === "string" ? shipping.addressLine2 : undefined,
      governorate: String(shipping.governorate ?? ""),
      city: String(shipping.city ?? ""),
      area: typeof shipping.area === "string" ? shipping.area : undefined,
      landmark: typeof shipping.landmark === "string" ? shipping.landmark : undefined,
    },
    shippingCompany:
      typeof source.shippingCompany === "string" ? source.shippingCompany : undefined,
    shippingStatus: (source.shippingStatus as ShippingStatus) || "pending",
    turboShipmentId:
      typeof source.turboShipmentId === "string" ? source.turboShipmentId : undefined,
    trackingNumber:
      typeof source.trackingNumber === "string" ? source.trackingNumber : undefined,
    trackingUrl: typeof source.trackingUrl === "string" ? source.trackingUrl : undefined,
    paymentMethod: (source.paymentMethod as PaymentMethod) || "cash_on_delivery",
    paymentStatus: (source.paymentStatus as PaymentStatus) || "pending",
    paymobOrderId: typeof source.paymobOrderId === "string" ? source.paymobOrderId : undefined,
    paymobPaymentId:
      typeof source.paymobPaymentId === "string" ? source.paymobPaymentId : undefined,
    paymobTransactionId:
      typeof source.paymobTransactionId === "string" ? source.paymobTransactionId : undefined,
    orderStatus: (source.orderStatus as OrderStatus) || "pending",
    notes: typeof source.notes === "string" ? source.notes : undefined,
    adminNotes: typeof source.adminNotes === "string" ? source.adminNotes : undefined,
    createdAt: typeof source.createdAt === "string" ? source.createdAt : undefined,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    return message || fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export function formatEgp(value?: number) {
  return `${Number(value ?? 0).toFixed(2)} EGP`;
}

export function parseVariant(variant?: string) {
  if (!variant) return { size: "-", color: "-" };
  const sep = "__";
  const index = variant.indexOf(sep);
  if (index <= 0) return { size: "-", color: "-" };
  return {
    size: variant.slice(0, index) || "-",
    color: variant.slice(index + sep.length) || "-",
  };
}

export function isRegisteredOrderUser(
  user: Order["user"],
): user is OrderUserRef | string {
  if (user == null) return false;
  if (typeof user === "string") return user.trim().length > 0;
  return typeof user === "object";
}

export function getCustomerDisplay(order: Pick<Order, "user" | "guestEmail" | "shippingAddress">) {
  if (order.user && typeof order.user === "object") {
    return {
      name: order.user.name || order.shippingAddress?.fullName || "Customer",
      email: order.user.email || order.guestEmail || "-",
      phone: order.shippingAddress?.phone1 || "-",
      isGuest: false,
    };
  }
  if (typeof order.user === "string" && order.user.trim()) {
    return {
      name: order.shippingAddress?.fullName || "Registered customer",
      email: order.guestEmail || "-",
      phone: order.shippingAddress?.phone1 || "-",
      isGuest: false,
    };
  }
  return {
    name: order.shippingAddress?.fullName || "Guest",
    email: order.guestEmail || "-",
    phone: order.shippingAddress?.phone1 || "-",
    isGuest: true,
  };
}

export function getProductId(product: OrderItem["product"]) {
  if (typeof product === "string") return product;
  return product._id ?? "";
}

export function roundOrderMoney(value: number) {
  return Math.round(Math.max(0, value) * 100) / 100;
}

export function computeItemsSubtotal(items: Pick<OrderItemUpdate, "price" | "quantity">[]) {
  return roundOrderMoney(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
}

export function getProductTitle(product: OrderItem["product"]) {
  if (typeof product === "object" && product?.title) {
    if (typeof product.title === "string") return product.title;
    return product.title.en || product.title.ar || "Item";
  }
  return "Item";
}

export function getProductImage(product: OrderItem["product"]) {
  if (typeof product === "object") {
    if (product.mainImage) return product.mainImage;
    if (product.images?.[0]) return product.images[0];
    const mediaImage = product.productImagesAndVideos?.find(
      (entry) => entry?.type === "image" && entry?.url,
    )?.url;
    if (mediaImage) return mediaImage;
    if (product.secondaryImage) return product.secondaryImage;
  }
  return null;
}

export function paymentMethodLabel(method?: PaymentMethod | string) {
  switch (method) {
    case "paymob_card":
      return "Card (Paymob)";
    case "paymob_wallet":
      return "Wallet (Paymob)";
    case "cash_on_delivery":
      return "COD";
    default:
      return method || "-";
  }
}

export function orderStatusBadgeClass(status?: OrderStatus | string) {
  switch (status) {
    case "pending":
      return "bg-gray-100 text-gray-700";
    case "confirmed":
    case "processing":
      return "bg-blue-100 text-blue-700";
    case "shipped":
      return "bg-orange-100 text-orange-700";
    case "delivered":
      return "bg-green-100 text-green-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function paymentStatusBadgeClass(status?: PaymentStatus | string) {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "paid":
      return "bg-green-100 text-green-700";
    case "failed":
    case "refunded":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function shippingStatusBadgeClass(status?: ShippingStatus | string) {
  switch (status) {
    case "delivered":
      return "bg-green-100 text-green-700";
    case "failed":
    case "returned":
    case "cancelled":
      return "bg-red-100 text-red-700";
    case "in_transit":
    case "out_for_delivery":
    case "picked_up":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export async function getOrders(params: GetOrdersParams = {}): Promise<GetOrdersResult> {
  const baseURL = getBaseUrl();
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  };
  if (params.status) query.status = params.status;

  const { data } = await api.get<OrdersListResponse>("/orders", { baseURL, params: query });
  const rawOrders =
    (data?.data as { orders?: unknown[] } | undefined)?.orders ?? data?.orders ?? [];

  const orders = rawOrders
    .map((item) => normalizeOrder(item))
    .filter((item): item is Order => Boolean(item));

  const pagination = data?.pagination ?? {};
  return {
    orders,
    results: Number(data?.results ?? orders.length),
    pagination: {
      page: Number(pagination.page ?? params.page ?? 1),
      pages: Number(pagination.pages ?? 1),
      total: Number(pagination.total ?? orders.length),
    },
  };
}

export async function getOrderById(id: string): Promise<Order | null> {
  const baseURL = getBaseUrl();
  const { data } = await api.get<OrderResponse>(`/orders/${id}`, { baseURL });
  const payload = data?.data;
  const orderRaw =
    (payload && typeof payload === "object" && "order" in (payload as object)
      ? (payload as { order?: unknown }).order
      : undefined) ?? data?.order ?? payload;
  return normalizeOrder(orderRaw);
}

export type TurboEditResult = {
  attempted?: boolean;
  ok?: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  changedFields?: string[];
};

export type OrderUpdateResult = {
  order: Order;
  message?: string;
  turboEdit?: TurboEditResult;
};

export async function updateOrder(
  id: string,
  body: OrderUpdateBody,
): Promise<OrderUpdateResult> {
  const baseURL = getBaseUrl();
  const { data } = await api.patch<OrderResponse & { message?: string }>(
    `/orders/${id}`,
    body,
    { baseURL },
  );
  const payload = data?.data as
    | { order?: unknown; turboEdit?: TurboEditResult }
    | undefined;
  const orderRaw = payload?.order ?? data?.order ?? payload;
  const order = normalizeOrder(orderRaw);
  if (order) {
    return {
      order,
      message: data?.message,
      turboEdit: payload?.turboEdit,
    };
  }

  const refetched = await getOrderById(id);
  if (refetched) {
    return { order: refetched, message: data?.message };
  }

  throw new Error("Order updated but response could not be parsed.");
}

export async function deleteOrder(id: string): Promise<void> {
  const baseURL = getBaseUrl();
  await api.delete(`/orders/${id}`, { baseURL });
}

export const ORDER_STATUS_TABS: Array<{ value: "all" | OrderStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];
