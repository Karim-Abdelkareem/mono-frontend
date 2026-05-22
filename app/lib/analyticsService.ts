"use client";

import axios from "axios";
import { api } from "./api";

export type DashboardSummary = {
  totalRevenue: number;
  paidItems: number;
  productsCount: number;
  currency: string;
};

export type DashboardStats = {
  summary: DashboardSummary;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  activityByMonth: Array<{ month: string; paidItems: number; products: number }>;
  salesByCategory: Array<{ name: string; value: number }>;
  ordersBySize: Array<{ size: string; orders: number }>;
  ordersByWeek: Array<{ week: string; orders: number }>;
};

type AnalyticsResponse = {
  status?: string;
  data?: DashboardStats;
};

function getBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not set.");
  }
  return baseUrl;
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

export async function getDashboardStats(period?: string): Promise<DashboardStats> {
  const baseURL = getBaseUrl();
  const { data } = await api.get<AnalyticsResponse>("/analytics", {
    baseURL,
    params: period ? { period } : undefined,
  });
  if (!data?.data) {
    throw new Error("Invalid analytics response.");
  }
  return data.data;
}
