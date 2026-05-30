import {
  PRODUCT_COLORS,
  PRODUCT_SIZES,
  ProductColor,
  ProductColorImage,
  ProductCreatePayload,
  ProductEntity,
  ProductMediaItem,
  ProductSize,
  ProductUpdatePayload,
} from "@/app/store/productStore";

export type ProductFormVariantColor = {
  color: ProductColor;
  quantity: number;
};

export type ProductFormVariant = {
  size: ProductSize;
  colors: ProductFormVariantColor[];
};

export type ProductFormValues = {
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  category: string;
  basePrice: number;
  discount: number;
  finalPrice: number;
  isActive: boolean;
  productImagesAndVideos: ProductMediaItem[];
  colorImages: ProductColorImage[];
  variants: ProductFormVariant[];
  sizeChartId: string;
};

export type ProductValidationResult = {
  valid: boolean;
  errors: string[];
};

const emptyVariant: ProductFormVariant = {
  size: "M",
  colors: [{ color: "Black", quantity: 0 }],
};

export const DEFAULT_PRODUCT_FORM_VALUES: ProductFormValues = {
  title: { en: "", ar: "" },
  description: { en: "", ar: "" },
  category: "",
  basePrice: 0,
  discount: 0,
  finalPrice: 0,
  isActive: true,
  productImagesAndVideos: [],
  colorImages: [{ color: "Black", images: [] }],
  variants: [emptyVariant],
  sizeChartId: "",
};

export function normalizeFormValuesFromProduct(
  product: ProductEntity | null,
): ProductFormValues {
  if (!product) return DEFAULT_PRODUCT_FORM_VALUES;
  return {
    title: { en: product.title.en ?? "", ar: product.title.ar ?? "" },
    description: {
      en: product.description.en ?? "",
      ar: product.description.ar ?? "",
    },
    category: product.category ?? "",
    basePrice: Number(product.basePrice ?? 0),
    discount: Number(product.discount ?? 0),
    finalPrice: Number(product.finalPrice ?? 0),
    isActive: Boolean(product.isActive),
    productImagesAndVideos: product.productImagesAndVideos.length
      ? product.productImagesAndVideos
      : [],
    colorImages: product.colorImages.length
      ? product.colorImages
      : [{ color: "Black", images: [] }],
    variants: product.variants.length
      ? product.variants.map((variant) => ({
          size: variant.size,
          colors: variant.colors.map((entry) => ({
            color: entry.color,
            quantity: Number(entry.quantity ?? 0),
          })),
        }))
      : [emptyVariant],
    sizeChartId: product.sizeChart?._id ?? "",
  };
}

export function validateProductForm(values: ProductFormValues): ProductValidationResult {
  const errors: string[] = [];
  if (!values.title.en.trim() || !values.title.ar.trim()) {
    errors.push("Title (EN/AR) is required.");
  }
  if (!values.description.en.trim() || !values.description.ar.trim()) {
    errors.push("Description (EN/AR) is required.");
  }
  if (!values.category) {
    errors.push("Category is required.");
  }
  if (!values.productImagesAndVideos.length) {
    errors.push("Add at least one product image or video.");
  }
  if (!values.productImagesAndVideos.some((item) => item.type === "image")) {
    errors.push("At least one product image is required.");
  }
  if (values.basePrice < 0 || values.discount < 0) {
    errors.push("Base price and discount must be non-negative.");
  }

  const colorImageSet = new Set(values.colorImages.map((entry) => entry.color));
  if (!values.colorImages.length) errors.push("At least one color gallery is required.");
  values.colorImages.forEach((entry) => {
    if (!PRODUCT_COLORS.includes(entry.color)) {
      errors.push(`Invalid color in gallery: ${entry.color}`);
    }
    if (!entry.images.length) {
      errors.push(`Color ${entry.color} must have at least one image.`);
    }
  });

  if (!values.variants.length) errors.push("At least one size variant is required.");
  values.variants.forEach((variant) => {
    if (!PRODUCT_SIZES.includes(variant.size)) {
      errors.push(`Invalid size: ${variant.size}`);
    }
    if (!variant.colors.length) {
      errors.push(`Size ${variant.size} must include at least one color.`);
    }
    variant.colors.forEach((colorEntry) => {
      if (!PRODUCT_COLORS.includes(colorEntry.color)) {
        errors.push(`Invalid variant color: ${colorEntry.color}`);
      }
      if (colorEntry.quantity < 0) {
        errors.push(`Quantity for ${variant.size}/${colorEntry.color} must be non-negative.`);
      }
      if (!colorImageSet.has(colorEntry.color)) {
        errors.push(
          `Variant color ${colorEntry.color} in size ${variant.size} must exist in color galleries.`,
        );
      }
    });
  });

  return { valid: errors.length === 0, errors };
}

function resolveSizeChartId(sizeChartId: string): string | null {
  const trimmed = sizeChartId.trim();
  return trimmed ? trimmed : null;
}

function deriveLegacyImages(media: ProductMediaItem[]) {
  const imageUrls = media
    .filter((item) => item.type === "image" && item.url)
    .map((item) => item.url);
  const mainImage = imageUrls[0] ?? "";
  const secondaryImage = imageUrls[1] ?? imageUrls[0] ?? "";
  return { mainImage, secondaryImage };
}

export function buildCreateProductPayload(values: ProductFormValues): ProductCreatePayload {
  const { mainImage, secondaryImage } = deriveLegacyImages(values.productImagesAndVideos);
  return {
    title: values.title,
    description: values.description,
    category: values.category,
    basePrice: values.basePrice,
    discount: values.discount,
    finalPrice: values.finalPrice,
    isActive: values.isActive,
    mainImage,
    secondaryImage,
    productImagesAndVideos: values.productImagesAndVideos,
    colorImages: values.colorImages.map((entry) => ({
      color: entry.color,
      images: Array.from(new Set(entry.images)),
    })),
    variants: values.variants.map((variant) => ({
      size: variant.size,
      colors: variant.colors.map((entry) => ({
        color: entry.color,
        quantity: entry.quantity,
      })),
    })),
    sizeChart: resolveSizeChartId(values.sizeChartId),
  };
}

function sameStringArray(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((item, idx) => item === b[idx]);
}

function mapFullVariantsForUpdate(
  variants: ProductFormValues["variants"],
): NonNullable<ProductUpdatePayload["variants"]> {
  return variants.map((variant) => ({
    size: variant.size,
    colors: variant.colors.map((entry) => ({
      color: entry.color,
      quantity: Number(entry.quantity ?? 0),
    })),
  }));
}

export function buildUpdateProductPayload(
  initialValues: ProductFormValues,
  currentValues: ProductFormValues,
): ProductUpdatePayload {
  const payload: ProductUpdatePayload = {};

  if (JSON.stringify(initialValues.title) !== JSON.stringify(currentValues.title)) {
    payload.title = currentValues.title;
  }
  if (
    JSON.stringify(initialValues.description) !==
    JSON.stringify(currentValues.description)
  ) {
    payload.description = currentValues.description;
  }
  if (initialValues.category !== currentValues.category) payload.category = currentValues.category;
  if (initialValues.basePrice !== currentValues.basePrice) payload.basePrice = currentValues.basePrice;
  if (initialValues.discount !== currentValues.discount) payload.discount = currentValues.discount;
  if (initialValues.finalPrice !== currentValues.finalPrice) payload.finalPrice = currentValues.finalPrice;
  if (initialValues.isActive !== currentValues.isActive) payload.isActive = currentValues.isActive;
  if (
    JSON.stringify(initialValues.productImagesAndVideos) !==
    JSON.stringify(currentValues.productImagesAndVideos)
  ) {
    const { mainImage, secondaryImage } = deriveLegacyImages(
      currentValues.productImagesAndVideos,
    );
    payload.productImagesAndVideos = currentValues.productImagesAndVideos;
    payload.mainImage = mainImage;
    payload.secondaryImage = secondaryImage;
  }

  const initialColorMap = new Map(initialValues.colorImages.map((item) => [item.color, item.images]));
  const currentColorMap = new Map(currentValues.colorImages.map((item) => [item.color, item.images]));
  const allColors = new Set<ProductColor>([
    ...Array.from(initialColorMap.keys()),
    ...Array.from(currentColorMap.keys()),
  ]);

  const colorCommands: NonNullable<ProductUpdatePayload["colorImages"]> = [];
  allColors.forEach((color) => {
    const prev = initialColorMap.get(color);
    const next = currentColorMap.get(color);
    if (prev && !next) {
      colorCommands.push({ color, _delete: true });
      return;
    }
    if (!prev && next) {
      colorCommands.push({ color, images: next });
      return;
    }
    if (!prev || !next || sameStringArray(prev, next)) return;

    const addImages = next.filter((item) => !prev.includes(item));
    const removeImages = prev.filter((item) => !next.includes(item));
    if (!addImages.length && !removeImages.length) return;
    if (addImages.length) colorCommands.push({ color, addImages });
    if (removeImages.length) colorCommands.push({ color, removeImages });
  });
  if (colorCommands.length) payload.colorImages = colorCommands;

  if (JSON.stringify(initialValues.variants) !== JSON.stringify(currentValues.variants)) {
    payload.variants = mapFullVariantsForUpdate(currentValues.variants);
  }
  if (initialValues.sizeChartId !== currentValues.sizeChartId) {
    payload.sizeChart = resolveSizeChartId(currentValues.sizeChartId);
  }

  return payload;
}
