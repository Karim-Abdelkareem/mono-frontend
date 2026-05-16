"use client";

import axios from "axios";
import { api } from "./api";

export type CouponType = "percent" | "fixed";

export type Coupon = {
  _id: string;
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount: number;
  maxUsages: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: string;
  createdByOrder?: string;
  createdForUser?: string | null;
  createdForEmail?: string | null;
  usedInOrders?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateCouponPayload = {
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount?: number;
  maxUsages?: number;
  expiryDays?: number;
  createdForEmail?: string | null;
};

export type UpdateCouponPayload = {
  coupon: Partial<
    Pick<
      Coupon,
      | "code"
      | "type"
      | "value"
      | "minOrderAmount"
      | "maxUsages"
      | "expiresAt"
      | "isActive"
      | "createdForEmail"
      | "createdForUser"
    >
  >;
};

type CouponResponse = {
  data?: unknown;
  coupon?: unknown;
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

function normalizeCoupon(raw: unknown): Coupon | null {
  const source = asRecord(raw);
  if (!source || typeof source._id !== "string") return null;

  const usedInOrders = Array.isArray(source.usedInOrders)
    ? source.usedInOrders.filter((id): id is string => typeof id === "string")
    : undefined;

  return {
    _id: source._id,
    code: typeof source.code === "string" ? source.code : "",
    type: source.type === "fixed" ? "fixed" : "percent",
    value: Number(source.value ?? 0),
    minOrderAmount: Number(source.minOrderAmount ?? 0),
    maxUsages: Number(source.maxUsages ?? 1),
    usedCount: Number(source.usedCount ?? 0),
    isActive: Boolean(source.isActive ?? true),
    expiresAt: typeof source.expiresAt === "string" ? source.expiresAt : "",
    createdByOrder:
      typeof source.createdByOrder === "string" ? source.createdByOrder : undefined,
    createdForUser:
      source.createdForUser === null
        ? null
        : typeof source.createdForUser === "string"
          ? source.createdForUser
          : undefined,
    createdForEmail:
      source.createdForEmail === null
        ? null
        : typeof source.createdForEmail === "string"
          ? source.createdForEmail
          : undefined,
    usedInOrders,
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

export function formatEgp(value: number) {
  return `${Number(value || 0).toFixed(2)} EGP`;
}

export function formatCouponValue(coupon: Pick<Coupon, "type" | "value">) {
  return coupon.type === "percent" ? `${coupon.value}%` : formatEgp(coupon.value);
}

export function formatUsage(coupon: Pick<Coupon, "usedCount" | "maxUsages">) {
  const max = coupon.maxUsages === 0 ? "∞" : String(coupon.maxUsages);
  return `${coupon.usedCount} / ${max}`;
}

export function isCouponExpired(coupon: Pick<Coupon, "expiresAt">) {
  if (!coupon.expiresAt) return false;
  return new Date(coupon.expiresAt).getTime() < Date.now();
}

export function isCouponMaxedOut(coupon: Pick<Coupon, "usedCount" | "maxUsages">) {
  return coupon.maxUsages > 0 && coupon.usedCount >= coupon.maxUsages;
}

export function isCouponRestricted(coupon: Pick<Coupon, "createdForEmail" | "createdForUser">) {
  return Boolean(coupon.createdForEmail || coupon.createdForUser);
}

export type CouponDisplayState = "active" | "inactive" | "expired" | "maxed";

export function getCouponDisplayState(
  coupon: Pick<Coupon, "isActive" | "expiresAt" | "usedCount" | "maxUsages">,
): CouponDisplayState {
  if (isCouponExpired(coupon)) return "expired";
  if (isCouponMaxedOut(coupon)) return "maxed";
  if (!coupon.isActive) return "inactive";
  return "active";
}

export function couponStateBadgeClass(state: CouponDisplayState) {
  switch (state) {
    case "active":
      return "bg-green-100 text-green-700";
    case "inactive":
      return "bg-gray-100 text-gray-700";
    case "expired":
      return "bg-red-100 text-red-700";
    case "maxed":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export async function getCoupons(): Promise<Coupon[]> {
  const baseURL = getBaseUrl();
  const { data } = await api.get<CouponResponse>("/coupons", { baseURL });
  const raw =
    (Array.isArray(data?.data) ? data.data : undefined) ??
    (data?.data as { coupons?: unknown[] } | undefined)?.coupons ??
    [];

  return raw.map((item) => normalizeCoupon(item)).filter((item): item is Coupon => Boolean(item));
}

export async function getCouponById(id: string): Promise<Coupon | null> {
  const baseURL = getBaseUrl();
  const { data } = await api.get<CouponResponse>(`/coupons/${id}`, { baseURL });
  return normalizeCoupon(data?.data ?? data?.coupon ?? null);
}

export async function createCoupon(payload: CreateCouponPayload): Promise<Coupon> {
  const baseURL = getBaseUrl();
  const body = {
    ...payload,
    code: payload.code.trim().toUpperCase(),
    createdForEmail: payload.createdForEmail?.trim() || null,
  };
  const { data } = await api.post<CouponResponse>("/coupons", body, { baseURL });
  const coupon = normalizeCoupon(data?.data ?? data?.coupon ?? null);
  if (!coupon) {
    throw new Error("Coupon created but response is invalid.");
  }
  return coupon;
}

export async function updateCoupon(
  id: string,
  coupon: UpdateCouponPayload["coupon"],
): Promise<Coupon> {
  const baseURL = getBaseUrl();
  const { data } = await api.patch<CouponResponse>(
    `/coupons/${id}`,
    { coupon },
    { baseURL },
  );
  const updated = normalizeCoupon(data?.data ?? data?.coupon ?? null);
  if (!updated) {
    throw new Error("Coupon updated but response is invalid.");
  }
  return updated;
}

export async function toggleCoupon(id: string, isActive: boolean): Promise<Coupon> {
  const baseURL = getBaseUrl();
  const { data } = await api.patch<CouponResponse>(
    `/coupons/${id}/toggle`,
    { isActive },
    { baseURL },
  );
  const coupon = normalizeCoupon(data?.data ?? data?.coupon ?? null);
  if (!coupon) {
    throw new Error("Coupon toggled but response is invalid.");
  }
  return coupon;
}

export async function deleteCoupon(id: string): Promise<void> {
  const baseURL = getBaseUrl();
  await api.delete(`/coupons/${id}`, { baseURL });
}
