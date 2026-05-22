"use client";

import axios from "axios";
import { api } from "./api";
import {
  SizeChart,
  SizeChartCreatePayload,
  SizeChartRow,
  SizeChartRowValue,
  SizeChartSize,
  SizeChartUnit,
  SizeChartUpdatePayload,
} from "./types/sizeChart";
import { PRODUCT_SIZES } from "@/app/store/productStore";

type SizeChartResponse = {
  data?: unknown;
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

function isSizeChartSize(value: string): value is SizeChartSize {
  return (PRODUCT_SIZES as readonly string[]).includes(value);
}

function normalizeLocalizedLabel(raw: unknown): SizeChart["name"] {
  const source = asRecord(raw);
  if (!source) return {};
  return {
    en: typeof source.en === "string" ? source.en : undefined,
    ar: typeof source.ar === "string" ? source.ar : undefined,
  };
}

function normalizeRowValues(raw: unknown): SizeChartRowValue[] {
  if (!Array.isArray(raw)) return [];
  return raw.reduce<SizeChartRowValue[]>((acc, entry) => {
    const item = asRecord(entry);
    if (!item) return acc;
    const size = typeof item.size === "string" ? item.size : "";
    if (!isSizeChartSize(size)) return acc;
    const value = Number(item.value);
    if (!Number.isFinite(value)) return acc;
    acc.push({ size, value });
    return acc;
  }, []);
}

function normalizeRows(raw: unknown): SizeChartRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.reduce<SizeChartRow[]>((acc, entry) => {
    const item = asRecord(entry);
    if (!item) return acc;
    acc.push({
      label: normalizeLocalizedLabel(item.label),
      values: normalizeRowValues(item.values),
    });
    return acc;
  }, []);
}

export function normalizeSizeChart(raw: unknown): SizeChart | null {
  const source = asRecord(raw);
  if (!source || typeof source._id !== "string") return null;

  const unit: SizeChartUnit = source.unit === "inch" ? "inch" : "cm";

  return {
    _id: source._id,
    name: normalizeLocalizedLabel(source.name),
    slug: typeof source.slug === "string" ? source.slug : "",
    isActive: Boolean(source.isActive ?? true),
    unit,
    rows: normalizeRows(source.rows),
    createdAt: typeof source.createdAt === "string" ? source.createdAt : undefined,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
}

function normalizeList(raw: unknown): SizeChart[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((item) => normalizeSizeChart(item))
    .filter((item): item is SizeChart => Boolean(item));
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

export function getSizeChartDisplayName(chart: Pick<SizeChart, "name">) {
  return chart.name.en?.trim() || chart.name.ar?.trim() || "Untitled chart";
}

export async function fetchActiveSizeCharts(): Promise<SizeChart[]> {
  const baseURL = getBaseUrl();
  const { data } = await api.get<SizeChartResponse>("/size-charts/active", { baseURL });
  return normalizeList(data?.data);
}

export async function getSizeCharts(): Promise<SizeChart[]> {
  const baseURL = getBaseUrl();
  const { data } = await api.get<SizeChartResponse>("/size-charts", { baseURL });
  return normalizeList(data?.data);
}

export async function getInactiveSizeCharts(): Promise<SizeChart[]> {
  const baseURL = getBaseUrl();
  const { data } = await api.get<SizeChartResponse>("/size-charts/inactive/list", {
    baseURL,
  });
  return normalizeList(data?.data);
}

export async function getSizeChartById(id: string): Promise<SizeChart | null> {
  const baseURL = getBaseUrl();
  const { data } = await api.get<SizeChartResponse>(`/size-charts/${id}`, { baseURL });
  return normalizeSizeChart(data?.data ?? null);
}

export async function createSizeChart(payload: SizeChartCreatePayload): Promise<SizeChart> {
  const baseURL = getBaseUrl();
  const { data } = await api.post<SizeChartResponse>("/size-charts", payload, { baseURL });
  const chart = normalizeSizeChart(data?.data ?? null);
  if (!chart) {
    throw new Error("Size chart created but response is invalid.");
  }
  return chart;
}

export async function updateSizeChart(
  id: string,
  payload: SizeChartUpdatePayload,
): Promise<SizeChart> {
  const baseURL = getBaseUrl();
  const { data } = await api.put<SizeChartResponse>(`/size-charts/${id}`, payload, { baseURL });
  const chart = normalizeSizeChart(data?.data ?? null);
  if (!chart) {
    throw new Error("Size chart updated but response is invalid.");
  }
  return chart;
}

export async function toggleSizeChart(id: string, isActive: boolean): Promise<SizeChart> {
  const baseURL = getBaseUrl();
  const { data } = await api.patch<SizeChartResponse>(
    `/size-charts/${id}/toggle`,
    { isActive },
    { baseURL },
  );
  const chart = normalizeSizeChart(data?.data ?? null);
  if (!chart) {
    throw new Error("Size chart toggled but response is invalid.");
  }
  return chart;
}

export async function deleteSizeChart(id: string): Promise<void> {
  const baseURL = getBaseUrl();
  await api.delete(`/size-charts/${id}`, { baseURL });
}
