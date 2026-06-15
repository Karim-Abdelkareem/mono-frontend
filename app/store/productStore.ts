"use client";

import { create } from "zustand";
import { api } from "../lib/api";
import { normalizeSizeChart } from "../lib/sizeChartService";
import { SizeChart } from "../lib/types/sizeChart";

export const PRODUCT_SIZES = ["S", "M", "L", "XL", "XXL", "XXXL"] as const;

export type ProductSize = (typeof PRODUCT_SIZES)[number];
/** Palette color id (MongoDB ObjectId string). */
export type ProductColor = string;

export type ProductMediaType = "image" | "video";

export type ProductMediaItem = {
  url: string;
  type: ProductMediaType;
};

export type ProductColorImage = {
  color: ProductColor;
  images: string[];
};

export type ProductVariantColor = {
  color: ProductColor;
  quantity: number;
  sku?: string;
};

export type ProductVariant = {
  size: ProductSize;
  colors: ProductVariantColor[];
};

export type ProductCreatePayload = {
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  category: string;
  basePrice: number;
  discount: number;
  finalPrice: number;
  mainImage: string;
  secondaryImage: string;
  productImagesAndVideos: ProductMediaItem[];
  isActive: boolean;
  colorImages: ProductColorImage[];
  variants: ProductVariant[];
  sizeChart?: string | null;
};

export type ProductColorImageUpdateCommand = {
  color: ProductColor;
  images?: string[];
  addImages?: string[];
  removeImages?: string[];
  _delete?: true;
};

export type ProductVariantColorUpdateCommand = {
  color: ProductColor;
  quantity?: number;
  _delete?: true;
};

export type ProductVariantUpdateCommand = {
  size: ProductSize;
  colors?: ProductVariantColorUpdateCommand[];
  _delete?: true;
};

export type ProductUpdatePayload = Partial<
  Omit<ProductCreatePayload, "colorImages" | "variants">
> & {
  colorImages?: ProductColorImageUpdateCommand[];
  variants?: ProductVariantUpdateCommand[];
  sizeChart?: string | null;
};

export type ProductEntity = {
  _id: string;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  category: string;
  categoryName: string;
  basePrice: number;
  discount: number;
  finalPrice: number;
  isActive: boolean;
  mainImage: string;
  secondaryImage: string;
  productImagesAndVideos: ProductMediaItem[];
  colorImages: ProductColorImage[];
  variants: ProductVariant[];
  sizeChart: SizeChart | null;
};

type ProductApiResponse = {
  data?: unknown;
  product?: unknown;
};

type ProductState = {
  products: ProductEntity[];
  isLoading: boolean;
  error: string;
  fetchProducts: () => Promise<void>;
  createProduct: (payload: ProductCreatePayload) => Promise<void>;
  getProductById: (id: string) => Promise<ProductEntity | null>;
  updateProduct: (id: string, payload: ProductUpdatePayload) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
};

function getBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not set.");
  }
  return baseUrl;
}

function extractColorId(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj._id === "string" && obj._id.trim()) return obj._id.trim();
  }
  return null;
}

function isProductSize(value: string): value is ProductSize {
  return (PRODUCT_SIZES as readonly string[]).includes(value);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeProductMedia(value: unknown): ProductMediaItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      const url = typeof item.url === "string" ? item.url.trim() : "";
      const type = item.type === "video" ? "video" : item.type === "image" ? "image" : null;
      if (!url || !type) return null;
      return { url, type };
    })
    .filter((entry): entry is ProductMediaItem => Boolean(entry));
}

export function normalizeProductEntity(raw: unknown): ProductEntity | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;

  const legacyImages = normalizeStringArray(source.images);
  const mainImage =
    typeof source.mainImage === "string" ? source.mainImage : legacyImages[0] ?? "";
  const secondaryImage =
    typeof source.secondaryImage === "string"
      ? source.secondaryImage
      : legacyImages[1] ?? legacyImages[0] ?? "";

  let productImagesAndVideos = normalizeProductMedia(source.productImagesAndVideos);
  if (!productImagesAndVideos.length) {
    const legacyMedia: ProductMediaItem[] = [];
    if (mainImage) legacyMedia.push({ url: mainImage, type: "image" });
    if (secondaryImage && secondaryImage !== mainImage) {
      legacyMedia.push({ url: secondaryImage, type: "image" });
    }
    productImagesAndVideos = legacyMedia;
  }

  const rawColorImages = Array.isArray(source.colorImages) ? source.colorImages : [];
  let colorImages: ProductColorImage[] = rawColorImages
    .map((entry) => {
      const item = entry as Record<string, unknown>;
      const color = extractColorId(item.color);
      if (!color) return null;
      return { color, images: normalizeStringArray(item.images) };
    })
    .filter((entry): entry is ProductColorImage => Boolean(entry));

  const rawVariants = Array.isArray(source.variants) ? source.variants : [];
  let variants: ProductVariant[] = rawVariants.reduce<ProductVariant[]>(
    (acc, variantEntry) => {
      const variant = variantEntry as Record<string, unknown>;
      const size = typeof variant.size === "string" ? variant.size : "";
      if (!isProductSize(size)) return acc;

      if (Array.isArray(variant.colors)) {
        const colors = (variant.colors as unknown[]).reduce<ProductVariantColor[]>(
          (colorAcc, colorEntry) => {
            const colorData = colorEntry as Record<string, unknown>;
            const color = extractColorId(colorData.color);
            if (!color) return colorAcc;
            colorAcc.push({
              color,
              quantity: Number(colorData.quantity ?? 0),
              sku: typeof colorData.sku === "string" ? colorData.sku : undefined,
            });
            return colorAcc;
          },
          [],
        );
        acc.push({ size, colors });
        return acc;
      }

      const legacyColor = extractColorId(variant.color);
      if (!legacyColor) {
        acc.push({ size, colors: [] });
        return acc;
      }
      acc.push({
        size,
        colors: [
          {
            color: legacyColor,
            quantity: Number(variant.stock ?? 0),
            sku: typeof variant.sku === "string" ? variant.sku : undefined,
          },
        ],
      });
      return acc;
    },
    [],
  );

  if (!colorImages.length) {
    const map = new Map<string, string[]>();
    rawVariants.forEach((variantEntry) => {
      const variant = variantEntry as Record<string, unknown>;
      const color = extractColorId(variant.color);
      if (!color) return;
      const images = normalizeStringArray(variant.images);
      map.set(color, Array.from(new Set([...(map.get(color) ?? []), ...images])));
    });
    colorImages = Array.from(map.entries()).map(([color, images]) => ({ color, images }));
  }

  if (!variants.length && rawVariants.length) {
    const grouped = new Map<ProductSize, ProductVariantColor[]>();
    rawVariants.forEach((variantEntry) => {
      const variant = variantEntry as Record<string, unknown>;
      const size = typeof variant.size === "string" ? variant.size : "";
      const color = extractColorId(variant.color);
      if (!isProductSize(size) || !color) return;
      const current = grouped.get(size) ?? [];
      current.push({
        color,
        quantity: Number(variant.stock ?? 0),
        sku: typeof variant.sku === "string" ? variant.sku : undefined,
      });
      grouped.set(size, current);
    });
    variants = Array.from(grouped.entries()).map(([size, colors]) => ({ size, colors }));
  }

  const sizeChartRaw = source.sizeChart;
  const sizeChart =
    sizeChartRaw === null || sizeChartRaw === undefined
      ? null
      : normalizeSizeChart(sizeChartRaw);

  return {
    _id: typeof source._id === "string" ? source._id : "",
    title: {
      en: (source.title as { en?: string } | undefined)?.en ?? "",
      ar: (source.title as { ar?: string } | undefined)?.ar ?? "",
    },
    description: {
      en: (source.description as { en?: string } | undefined)?.en ?? "",
      ar: (source.description as { ar?: string } | undefined)?.ar ?? "",
    },
    category:
      typeof source.category === "string"
        ? source.category
        : ((source.category as { _id?: string } | undefined)?._id ?? ""),
    categoryName:
      typeof source.category === "object" && source.category
        ? ((source.category as { name?: { en?: string; ar?: string } }).name?.en ??
          (source.category as { name?: { en?: string; ar?: string } }).name?.ar ??
          "")
        : "",
    basePrice: Number(source.basePrice ?? 0),
    discount: Number(source.discount ?? 0),
    finalPrice: Number(source.finalPrice ?? 0),
    isActive: Boolean(source.isActive),
    mainImage,
    secondaryImage,
    productImagesAndVideos,
    colorImages,
    variants,
    sizeChart,
  };
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  isLoading: false,
  error: "",

  fetchProducts: async () => {
    set({ isLoading: true, error: "" });
    try {
      const baseUrl = getBaseUrl();
      const { data } = await api.get<{ data?: unknown[]; products?: unknown[] }>("/products", {
        baseURL: baseUrl,
      });
      const rawItems = data?.data ?? data?.products ?? [];
      const products = rawItems
        .map((item) => normalizeProductEntity(item))
        .filter((item): item is ProductEntity => Boolean(item));
      set({ products, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch products.",
      });
    }
  },

  createProduct: async (payload) => {
    set({ isLoading: true, error: "" });
    try {
      const baseUrl = getBaseUrl();
      await api.post("/products", payload, { baseURL: baseUrl });
      set({ isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to create product.",
      });
      throw error;
    }
  },

  getProductById: async (id: string) => {
    const baseUrl = getBaseUrl();
    const { data } = await api.get<ProductApiResponse>(`/products/${id}`, {
      baseURL: baseUrl,
    });
    return normalizeProductEntity(data?.data ?? data?.product ?? null);
  },

  updateProduct: async (id: string, payload: ProductUpdatePayload) => {
    set({ isLoading: true, error: "" });
    try {
      const baseUrl = getBaseUrl();
      await api.put(`/products/${id}`, payload, { baseURL: baseUrl });
      set({ isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to update product.",
      });
      throw error;
    }
  },

  deleteProduct: async (id: string) => {
    set({ isLoading: true, error: "" });
    try {
      const baseUrl = getBaseUrl();
      await api.delete(`/products/${id}`, { baseURL: baseUrl });
      set((state) => ({
        isLoading: false,
        products: state.products.filter((item) => item._id !== id),
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to delete product.",
      });
      throw error;
    }
  },
}));
