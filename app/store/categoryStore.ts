"use client";

import { create } from "zustand";
import { api } from "../lib/api";

export type Category = {
  _id: string;
  name: {
    en: string;
    ar: string;
  };
  slug: string;
  image: string;
  isActive: boolean;
};

type CategoryState = {
  categories: Category[];
  isLoading: boolean;
  error: string;
  fetchCategories: () => Promise<void>;
  getCategoryById: (id: string) => Promise<Category | null>;
  createCategory: (payload: FormData) => Promise<void>;
  updateCategory: (id: string, payload: FormData) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  toggleCategoryStatus: (id: string, nextIsActive: boolean) => Promise<void>;
};

function getBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not set.");
  }
  return baseUrl;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading: false,
  error: "",

  fetchCategories: async () => {
    set({ isLoading: true, error: "" });
    try {
      const baseUrl = getBaseUrl();
      const { data } = await api.get<{ data?: Category[]; categories?: Category[] }>(
        "/categories",
        {
          baseURL: baseUrl,
        }
      );
      set({
        categories: data?.data ?? data?.categories ?? [],
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch categories.",
      });
    }
  },

  getCategoryById: async (id: string) => {
    const baseUrl = getBaseUrl();
    const { data } = await api.get<{ data?: Category; category?: Category }>(
      `/categories/${id}`,
      { baseURL: baseUrl }
    );
    return data?.data ?? data?.category ?? null;
  },

  createCategory: async (payload: FormData) => {
    const baseUrl = getBaseUrl();
    await api.post("/categories", payload, {
      baseURL: baseUrl,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    await get().fetchCategories();
  },

  updateCategory: async (id: string, payload: FormData) => {
    const baseUrl = getBaseUrl();
    await api.put(`/categories/${id}`, payload, {
      baseURL: baseUrl,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    await get().fetchCategories();
  },

  deleteCategory: async (id: string) => {
    const baseUrl = getBaseUrl();
    await api.delete(`/categories/${id}`, {
      baseURL: baseUrl,
    });
    set((state) => ({
      categories: state.categories.filter((item) => item._id !== id),
    }));
  },

  toggleCategoryStatus: async (id: string, nextIsActive: boolean) => {
    const baseUrl = getBaseUrl();
    await api.put(
      `/categories/${id}`,
      { isActive: String(nextIsActive) },
      { baseURL: baseUrl }
    );
    set((state) => ({
      categories: state.categories.map((item) =>
        item._id === id ? { ...item, isActive: nextIsActive } : item
      ),
    }));
  },
}));
