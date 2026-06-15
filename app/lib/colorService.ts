"use client";

import axios from "axios";
import { api } from "./api";
import {
  ColorCreatePayload,
  ColorUpdatePayload,
  PaletteColor,
} from "./types/color";

type ColorResponse = {
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

function normalizeLocalizedName(raw: unknown): PaletteColor["name"] {
  const source = asRecord(raw);
  if (!source) return {};
  return {
    en: typeof source.en === "string" ? source.en : undefined,
    ar: typeof source.ar === "string" ? source.ar : undefined,
  };
}

export function normalizePaletteColor(raw: unknown): PaletteColor | null {
  const source = asRecord(raw);
  if (!source || typeof source._id !== "string") return null;
  const hexCode = typeof source.hexCode === "string" ? source.hexCode : "#000000";
  return {
    _id: source._id,
    name: normalizeLocalizedName(source.name),
    hexCode,
    slug: typeof source.slug === "string" ? source.slug : "",
    isActive: Boolean(source.isActive ?? true),
    createdAt: typeof source.createdAt === "string" ? source.createdAt : undefined,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
}

function normalizeList(raw: unknown): PaletteColor[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((item) => normalizePaletteColor(item))
    .filter((item): item is PaletteColor => Boolean(item));
}

export function getColorDisplayName(color: Pick<PaletteColor, "name"> | undefined) {
  return color?.name.en?.trim() || color?.name.ar?.trim() || "Untitled color";
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

export async function fetchActiveColors(): Promise<PaletteColor[]> {
  const baseURL = getBaseUrl();
  const { data } = await api.get<ColorResponse>("/colors/active", { baseURL });
  return normalizeList(data?.data);
}

export async function getColors(): Promise<PaletteColor[]> {
  const baseURL = getBaseUrl();
  const { data } = await api.get<ColorResponse>("/colors", { baseURL });
  return normalizeList(data?.data);
}

export async function getColorById(id: string): Promise<PaletteColor | null> {
  const baseURL = getBaseUrl();
  const { data } = await api.get<ColorResponse>(`/colors/${id}`, { baseURL });
  return normalizePaletteColor(data?.data ?? null);
}

export async function createColor(payload: ColorCreatePayload): Promise<PaletteColor> {
  const baseURL = getBaseUrl();
  const { data } = await api.post<ColorResponse>("/colors", payload, { baseURL });
  const color = normalizePaletteColor(data?.data ?? null);
  if (!color) {
    throw new Error("Color created but response is invalid.");
  }
  return color;
}

export async function updateColor(
  id: string,
  payload: ColorUpdatePayload,
): Promise<PaletteColor> {
  const baseURL = getBaseUrl();
  const { data } = await api.put<ColorResponse>(`/colors/${id}`, payload, { baseURL });
  const color = normalizePaletteColor(data?.data ?? null);
  if (!color) {
    throw new Error("Color updated but response is invalid.");
  }
  return color;
}

export async function deleteColor(id: string): Promise<void> {
  const baseURL = getBaseUrl();
  await api.delete(`/colors/${id}`, { baseURL });
}
