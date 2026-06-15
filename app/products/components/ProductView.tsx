"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Layers,
  Palette,
  Pencil,
  Ruler,
  Tag,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getColorDisplayName } from "@/app/lib/colorService";
import { PaletteColor } from "@/app/lib/types/color";
import SizeChartPreview from "@/app/size-charts/components/SizeChartPreview";
import { getSizeChartDisplayName } from "@/app/lib/sizeChartService";
import { ProductEntity } from "@/app/store/productStore";

type ProductViewProps = {
  product: ProductEntity;
  paletteById: Map<string, PaletteColor>;
  onDelete?: () => void;
  isDeleting?: boolean;
};

function getTotalStock(product: ProductEntity) {
  return product.variants.reduce(
    (sum, variant) =>
      sum +
      variant.colors.reduce(
        (colorSum, colorEntry) => colorSum + Number(colorEntry.quantity || 0),
        0,
      ),
    0,
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-4 text-gray-500" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default function ProductView({
  product,
  paletteById,
  onDelete,
  isDeleting,
}: ProductViewProps) {
  const title = product.title?.en || product.title?.ar || "Untitled";
  const totalStock = getTotalStock(product);

  const getColorLabel = (colorId: string) => {
    const color = paletteById.get(colorId);
    return color ? getColorDisplayName(color) : colorId;
  };

  const getColorHex = (colorId: string) =>
    paletteById.get(colorId)?.hexCode ?? "#d1d5db";

  const mediaImages = product.productImagesAndVideos.filter(
    (item) => item.type === "image",
  );
  const mediaVideos = product.productImagesAndVideos.filter(
    (item) => item.type === "video",
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
      <Link
        href="/products"
        className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="size-4" />
        Back to products
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {product.title.ar && (
            <p className="mt-1 text-lg text-gray-600" dir="rtl">
              {product.title.ar}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                product.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {product.isActive ? "Active" : "Inactive"}
            </span>
            <span className="text-sm text-gray-500">
              {product.categoryName || "Uncategorized"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/products/edit-product?id=${product._id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            <Pencil className="size-4" />
            Edit
          </Link>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 md:col-span-2">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Gallery
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {mediaImages.length ? (
              mediaImages.map((item) => (
                <div
                  key={item.url}
                  className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                >
                  <Image
                    src={item.url}
                    alt={title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))
            ) : (
              <p className="col-span-full text-sm text-gray-500">No images.</p>
            )}
          </div>
          {mediaVideos.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                <Video className="size-3.5" />
                Videos
              </p>
              <ul className="space-y-1 text-sm text-gray-700">
                {mediaVideos.map((item) => (
                  <li key={item.url}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline"
                    >
                      {item.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Pricing
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              ${Number(product.finalPrice || 0).toFixed(2)}
            </p>
            <dl className="mt-3 space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <dt>Base price</dt>
                <dd>${Number(product.basePrice || 0).toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Discount</dt>
                <dd>{Number(product.discount || 0)}%</dd>
              </div>
              <div className="flex justify-between font-medium text-gray-900">
                <dt>Total stock</dt>
                <dd>{totalStock}</dd>
              </div>
            </dl>
          </div>

          {product.sizeChart && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-gray-500">
                <Ruler className="size-3.5" />
                Size chart
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900">
                {getSizeChartDisplayName(product.sizeChart)}
              </p>
              <Link
                href={`/size-charts/edit-size-chart?id=${product.sizeChart._id}`}
                className="mt-1 inline-block text-xs text-gray-600 underline"
              >
                Open chart
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <SectionCard title="Description" icon={Tag}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">English</p>
              <p className="whitespace-pre-wrap text-sm text-gray-800">
                {product.description.en || "—"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">Arabic</p>
              <p
                className="whitespace-pre-wrap text-sm text-gray-800"
                dir="rtl"
              >
                {product.description.ar || "—"}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Color galleries" icon={Palette}>
          {!product.colorImages.length ? (
            <p className="text-sm text-gray-500">No color galleries.</p>
          ) : (
            <div className="space-y-4">
              {product.colorImages.map((entry) => (
                <div
                  key={entry.color}
                  className="rounded-lg border border-gray-100 bg-gray-50/50 p-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="size-5 rounded-full border border-black/10"
                      style={{ backgroundColor: getColorHex(entry.color) }}
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {getColorLabel(entry.color)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                    {entry.images.map((url) => (
                      <div
                        key={url}
                        className="relative aspect-square overflow-hidden rounded-md border border-gray-200"
                      >
                        <Image
                          src={url}
                          alt={getColorLabel(entry.color)}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Variants" icon={Layers}>
          {!product.variants.length ? (
            <p className="text-sm text-gray-500">No variants.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Size</th>
                    <th className="px-3 py-2 font-medium">Color</th>
                    <th className="px-3 py-2 font-medium">Quantity</th>
                    <th className="px-3 py-2 font-medium">SKU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {product.variants.flatMap((variant) =>
                    variant.colors.map((colorEntry) => (
                      <tr key={`${variant.size}-${colorEntry.color}`}>
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {variant.size}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="size-3 rounded-full border border-black/10"
                              style={{
                                backgroundColor: getColorHex(colorEntry.color),
                              }}
                            />
                            {getColorLabel(colorEntry.color)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {colorEntry.quantity}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-600">
                          {colorEntry.sku || "—"}
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {product.sizeChart && (
          <SectionCard title="Size chart preview" icon={Ruler}>
            <SizeChartPreview chart={product.sizeChart} />
          </SectionCard>
        )}
      </div>
    </div>
  );
}
