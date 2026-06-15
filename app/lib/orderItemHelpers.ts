import {
  PRODUCT_SIZES,
  ProductEntity,
  ProductSize,
} from "@/app/store/productStore";
import { PaletteColor } from "@/app/lib/types/color";
import { getColorDisplayName } from "@/app/lib/colorService";
import { OrderItem, OrderItemUpdate, roundOrderMoney } from "@/app/lib/orderService";

export function buildOrderVariantKey(size: string, colorId: string) {
  return `${size}__${colorId}`;
}

export function parseOrderVariant(variant?: string) {
  if (!variant) return { size: "", colorId: "" };
  const sep = "__";
  const index = variant.indexOf(sep);
  if (index <= 0) return { size: "", colorId: "" };
  return {
    size: variant.slice(0, index),
    colorId: variant.slice(index + sep.length),
  };
}

export function getProductLabel(product: ProductEntity | undefined) {
  if (!product) return "Product";
  return product.title.en?.trim() || product.title.ar?.trim() || "Product";
}

export function getColorLabel(colorId: string, palette: PaletteColor[]) {
  const match = palette.find((entry) => entry._id === colorId);
  if (match) return getColorDisplayName(match);
  return colorId || "Color";
}

export function getSizesForProduct(product: ProductEntity | undefined): ProductSize[] {
  if (!product?.variants?.length) return [];
  return product.variants
    .map((variant) => variant.size)
    .filter((size): size is ProductSize =>
      (PRODUCT_SIZES as readonly string[]).includes(size),
    );
}

export function getColorsForSize(
  product: ProductEntity | undefined,
  size: string,
): string[] {
  if (!product) return [];
  const variant = product.variants.find((entry) => entry.size === size);
  if (!variant) return [];
  return variant.colors.map((entry) => entry.color).filter(Boolean);
}

export function getVariantStock(
  product: ProductEntity | undefined,
  size: string,
  colorId: string,
) {
  if (!product) return 0;
  const variant = product.variants.find((entry) => entry.size === size);
  const colorRow = variant?.colors.find((entry) => entry.color === colorId);
  return Number(colorRow?.quantity ?? 0);
}

export function getDefaultVariant(product: ProductEntity | undefined) {
  const sizes = getSizesForProduct(product);
  for (const size of sizes) {
    const colors = getColorsForSize(product, size);
    for (const colorId of colors) {
      if (getVariantStock(product, size, colorId) > 0) {
        return { size, colorId };
      }
    }
    if (colors[0]) {
      return { size, colorId: colors[0] };
    }
  }
  const fallbackSize = sizes[0] ?? PRODUCT_SIZES[0];
  const fallbackColor = getColorsForSize(product, fallbackSize)[0] ?? "";
  return { size: fallbackSize, colorId: fallbackColor };
}

export function createOrderItemUpdate(
  product: ProductEntity,
  overrides: Partial<OrderItemUpdate> = {},
): OrderItemUpdate {
  const { size, colorId } = getDefaultVariant(product);
  const quantity = overrides.quantity ?? 1;
  const price = overrides.price ?? product.finalPrice;
  const variant =
    overrides.variant ?? buildOrderVariantKey(overrides.size ?? size, overrides.color ?? colorId);

  return {
    _id: overrides._id,
    product: overrides.product ?? product._id,
    size: overrides.size ?? size,
    color: overrides.color ?? colorId,
    quantity,
    price,
    variant,
    totalPrice: roundOrderMoney(price * quantity),
  };
}

export function orderItemsToUpdatePayload(items: OrderItem[]): OrderItemUpdate[] {
  return items.map((item) => {
    const { size, colorId } = parseOrderVariant(item.variant);
    return {
      _id: item._id,
      product: typeof item.product === "string" ? item.product : item.product._id ?? "",
      size,
      color: colorId,
      quantity: item.quantity,
      price: item.price,
      variant: item.variant,
      totalPrice: roundOrderMoney(item.price * item.quantity),
    };
  });
}

export function serializeOrderItemsForUpdate(items: OrderItemUpdate[]) {
  return items.map((item) => ({
    _id: item._id,
    product: item.product,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
    price: item.price,
    variant: item.variant,
    totalPrice: roundOrderMoney(item.price * item.quantity),
  }));
}

export function orderItemsMatch(a: OrderItemUpdate[], b: OrderItemUpdate[]) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return (
      item.product === other.product &&
      item.variant === other.variant &&
      item.quantity === other.quantity &&
      item.price === other.price
    );
  });
}

export function getProductImageForVariant(
  product: ProductEntity | undefined,
  colorId: string,
) {
  if (!product) return null;
  const colorImages = product.colorImages.find((entry) => entry.color === colorId);
  if (colorImages?.images?.[0]) return colorImages.images[0];
  if (product.mainImage) return product.mainImage;
  return product.secondaryImage || null;
}
