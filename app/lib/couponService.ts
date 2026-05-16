"use client";

import axios from "axios";
import { api } from "./api";

export type CouponStatus = "active" | "archived";

export type Coupon = {
  _id: string;
  code: string;
  discount: number;
  maxUses: number;
  uses: number;
  minOrderAmount: number | null;
  maxUsesPerUser: number;
  isActive: boolean;
  status: CouponStatus;
  archivedAt: string | null;
  archivedReason: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type GetCouponsParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: CouponStatus;
  isActive?: boolean;
};

export type CouponPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type GetCouponsResult = {
  coupons: Coupon[];
  pagination: CouponPagination;
};

export type CreateCouponPayload = {
  discount: number;
  maxUses: number;
  minOrderAmount: number | null;
  maxUsesPerUser: number;
  isActive: boolean;
};

export type UpdateCouponPayload = Partial<CreateCouponPayload>;

type CouponResponse = {
  data?: unknown;
  coupon?: unknown;
  coupons?: unknown[];
  pagination?: Partial<CouponPagination>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};

function getBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not set.");
  }
  return baseUrl;
}

function normalizeCoupon(raw: unknown): Coupon | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const status: CouponStatus = source.status === "archived" ? "archived" : "active";

  return {
    _id: typeof source._id === "string" ? source._id : "",
    code: typeof source.code === "string" ? source.code : "",
    discount: Number(source.discount ?? 0),
    maxUses: Number(source.maxUses ?? 0),
    uses: Number(source.uses ?? 0),
    minOrderAmount:
      source.minOrderAmount === null ? null : Number(source.minOrderAmount ?? 0),
    maxUsesPerUser: Number(source.maxUsesPerUser ?? 0),
    isActive: Boolean(source.isActive),
    status,
    archivedAt: typeof source.archivedAt === "string" ? source.archivedAt : null,
    archivedReason: typeof source.archivedReason === "string" ? source.archivedReason : null,
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

export async function getCoupons(params: GetCouponsParams = {}): Promise<GetCouponsResult> {
  const baseURL = getBaseUrl();
  const query: Record<string, string | number | boolean> = {};

  if (params.page) query.page = params.page;
  if (params.limit) query.limit = params.limit;
  if (params.search?.trim()) query.search = params.search.trim();
  if (params.status) query.status = params.status;
  if (typeof params.isActive === "boolean") query.isActive = params.isActive;

  const { data } = await api.get<CouponResponse>("/coupons", { baseURL, params: query });
  const rawCoupons =
    (data?.data as { coupons?: unknown[] } | undefined)?.coupons ??
    (Array.isArray(data?.data) ? data.data : undefined) ??
    data?.coupons ??
    [];

  const coupons = rawCoupons
    .map((item) => normalizeCoupon(item))
    .filter((item): item is Coupon => Boolean(item));

  const paginationSource = data?.pagination ?? data?.meta ?? {};
  const page = Number(paginationSource.page ?? params.page ?? 1);
  const resolvedLimit = paginationSource.limit ?? params.limit ?? coupons.length;
  const limit = Number(resolvedLimit || 10);
  const total = Number(paginationSource.total ?? coupons.length);
  const totalPages = Number(
    paginationSource.totalPages ?? Math.max(1, Math.ceil(total / Math.max(limit, 1))),
  );

  return {
    coupons,
    pagination: { page, limit, total, totalPages },
  };
}

export async function getCouponById(id: string): Promise<Coupon | null> {
  const baseURL = getBaseUrl();
  const { data } = await api.get<CouponResponse>(`/coupons/${id}`, { baseURL });
  return normalizeCoupon(data?.data ?? data?.coupon ?? null);
}

export async function createCoupon(payload: CreateCouponPayload): Promise<Coupon> {
  const baseURL = getBaseUrl();
  const { data } = await api.post<CouponResponse>("/coupons", payload, { baseURL });
  const coupon = normalizeCoupon(data?.data ?? data?.coupon ?? null);
  if (!coupon) {
    throw new Error("Coupon created but response is invalid.");
  }
  return coupon;
}

export async function updateCoupon(id: string, payload: UpdateCouponPayload): Promise<Coupon> {
  const baseURL = getBaseUrl();
  const { data } = await api.put<CouponResponse>(`/coupons/${id}`, payload, { baseURL });
  const coupon = normalizeCoupon(data?.data ?? data?.coupon ?? null);
  if (!coupon) {
    throw new Error("Coupon updated but response is invalid.");
  }
  return coupon;
}

export async function archiveCoupon(id: string): Promise<void> {
  const baseURL = getBaseUrl();
  await api.delete(`/coupons/${id}`, { baseURL });
}

export async function unarchiveCoupon(id: string): Promise<void> {
  const baseURL = getBaseUrl();
  await api.patch(`/coupons/${id}/unarchive`, {}, { baseURL });
}
