"use client";

import axios from "axios";
import { api } from "./api";

export const COVERED_ZONE_STATUS = "مغطاة";

export type Government = {
  _id: string;
  turboId: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Zone = {
  _id: string;
  turboZoneId: number;
  turboGovernmentId: number;
  government: string;
  name: string;
  status: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ListResponse<T> = {
  status?: string;
  data?: T[];
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

function normalizeGovernment(raw: unknown): Government | null {
  const source = asRecord(raw);
  if (!source || typeof source._id !== "string") return null;
  return {
    _id: source._id,
    turboId: typeof source.turboId === "string" ? source.turboId : String(source.turboId ?? ""),
    name: typeof source.name === "string" ? source.name : "",
    isActive: Boolean(source.isActive ?? true),
    createdAt: typeof source.createdAt === "string" ? source.createdAt : undefined,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
}

function normalizeZone(raw: unknown): Zone | null {
  const source = asRecord(raw);
  if (!source || typeof source._id !== "string") return null;
  const government = source.government;
  return {
    _id: source._id,
    turboZoneId: Number(source.turboZoneId ?? 0),
    turboGovernmentId: Number(source.turboGovernmentId ?? 0),
    government:
      typeof government === "string"
        ? government
        : asRecord(government)?._id
          ? String(asRecord(government)?._id)
          : "",
    name: typeof source.name === "string" ? source.name : "",
    status: typeof source.status === "string" ? source.status : "",
    isActive: Boolean(source.isActive ?? false),
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

export function isTurboCovered(status: string) {
  return status === COVERED_ZONE_STATUS;
}

export type ZoneStorefrontState = "active" | "hidden" | "disabled";

/** Storefront visibility (isActive) separate from Turbo status */
export function getZoneStorefrontState(zone: Pick<Zone, "status" | "isActive">): ZoneStorefrontState {
  if (zone.isActive && isTurboCovered(zone.status)) return "active";
  if (!zone.isActive && isTurboCovered(zone.status)) return "hidden";
  return "disabled";
}

export function zoneStorefrontBadgeClass(state: ZoneStorefrontState) {
  switch (state) {
    case "active":
      return "bg-green-100 text-green-700";
    case "hidden":
      return "bg-amber-100 text-amber-800";
    case "disabled":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export function zoneStorefrontLabel(state: ZoneStorefrontState) {
  switch (state) {
    case "active":
      return "Active";
    case "hidden":
      return "Hidden from store";
    case "disabled":
      return "Disabled";
    default:
      return "—";
  }
}

export function governmentActiveBadgeClass(isActive: boolean) {
  return isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600";
}

export async function getGovernments(
  options?: { activeFilter?: "all" | "true" | "false" },
): Promise<Government[]> {
  const baseURL = getBaseUrl();
  const params: Record<string, string> = {};
  if (options?.activeFilter === "true") params.active = "true";
  if (options?.activeFilter === "false") params.active = "false";

  const { data } = await api.get<ListResponse<unknown>>("/shipping/governments", {
    baseURL,
    params: Object.keys(params).length ? params : undefined,
  });
  const raw = Array.isArray(data?.data) ? data.data : [];
  return raw.map((item) => normalizeGovernment(item)).filter((item): item is Government => Boolean(item));
}

export type GetZonesOptions = {
  /** Default true — uses Turbo status مغطاة */
  coveredOnly?: boolean;
  /** When set, replaces status filter with isActive (API uses query string) */
  activeOnly?: boolean;
  status?: string;
};

export async function getZones(
  governmentId: string,
  options: GetZonesOptions = {},
): Promise<Zone[]> {
  const baseURL = getBaseUrl();
  const params: Record<string, string> = {};

  if (options.activeOnly === true) {
    params.active = "true";
  } else if (options.activeOnly === false) {
    params.active = "false";
  } else if (options.status) {
    params.status = options.status;
  } else if (options.coveredOnly !== false) {
    params.status = COVERED_ZONE_STATUS;
  }

  const { data } = await api.get<ListResponse<unknown>>(
    `/shipping/governments/${governmentId}/zones`,
    { baseURL, params },
  );
  const raw = Array.isArray(data?.data) ? data.data : [];
  return raw.map((item) => normalizeZone(item)).filter((item): item is Zone => Boolean(item));
}

export async function getGovernmentById(id: string): Promise<Government | null> {
  const governments = await getGovernments();
  return governments.find((g) => g._id === id) ?? null;
}

type ToggleResponse = {
  data?: unknown;
};

export async function toggleGovernment(id: string, isActive: boolean): Promise<Government> {
  const baseURL = getBaseUrl();
  const { data } = await api.patch<ToggleResponse>(
    `/shipping/governments/${id}/toggle`,
    { isActive },
    { baseURL },
  );
  const government = normalizeGovernment(data?.data);
  if (!government) {
    throw new Error("Government updated but response is invalid.");
  }
  return government;
}

export async function toggleZone(id: string, isActive: boolean): Promise<Zone> {
  const baseURL = getBaseUrl();
  const { data } = await api.patch<ToggleResponse>(
    `/shipping/zones/${id}/toggle`,
    { isActive },
    { baseURL },
  );
  const zone = normalizeZone(data?.data);
  if (!zone) {
    throw new Error("Zone updated but response is invalid.");
  }
  return zone;
}
