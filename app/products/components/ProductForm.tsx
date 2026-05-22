"use client";

import {
  ChangeEvent,
  Dispatch,
  FormEvent,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import Image from "next/image";
import {
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useCategoryStore } from "@/app/store/categoryStore";
import {
  fetchActiveSizeCharts,
  getSizeChartDisplayName,
} from "@/app/lib/sizeChartService";
import SizeChartPreview from "@/app/size-charts/components/SizeChartPreview";
import {
  PRODUCT_COLORS,
  PRODUCT_SIZES,
  ProductColor,
  ProductEntity,
  ProductSize,
  useProductStore,
} from "@/app/store/productStore";
import {
  buildCreateProductPayload,
  buildUpdateProductPayload,
  normalizeFormValuesFromProduct,
  ProductFormValues,
  validateProductForm,
} from "../productMappers";

type UploadItem = {
  id: string;
  previewUrl: string;
  uploadedUrl: string;
  isUploading: boolean;
};

const colorSwatches: Record<ProductColor, string> = {
  Red: "#ef4444",
  Blue: "#3b82f6",
  Green: "#22c55e",
  Yellow: "#facc15",
  Purple: "#a855f7",
  Orange: "#f97316",
  Pink: "#ec4899",
  Brown: "#92400e",
  Gray: "#6b7280",
  Black: "#111827",
  White: "#ffffff",
  "Baby Blue": "#56a3d9",
  Baige: "#F5F5DC",
  Burgundy: "#800020",
  Petroleum: "#003153",
};

type ProductFormProps = {
  mode: "create" | "edit";
  productId?: string;
  initialProduct?: ProductEntity | null;
};

type ConfirmDialogState = {
  open: boolean;
  title: string;
  description: string;
  onConfirm: (() => void) | null;
};

function toUploadItems(urls: string[]): UploadItem[] {
  return urls.map((url, index) => ({
    id: `${url}-${index}`,
    previewUrl: url,
    uploadedUrl: url,
    isUploading: false,
  }));
}

export default function ProductForm({
  mode,
  productId,
  initialProduct,
}: ProductFormProps) {
  const router = useRouter();
  const categories = useCategoryStore((state) => state.categories);
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);
  const createProduct = useProductStore((state) => state.createProduct);
  const updateProduct = useProductStore((state) => state.updateProduct);

  const editSeed =
    mode === "edit" && initialProduct
      ? normalizeFormValuesFromProduct(initialProduct)
      : null;

  const [titleEn, setTitleEn] = useState(editSeed?.title.en ?? "");
  const [titleAr, setTitleAr] = useState(editSeed?.title.ar ?? "");
  const [descriptionEn, setDescriptionEn] = useState(editSeed?.description.en ?? "");
  const [descriptionAr, setDescriptionAr] = useState(editSeed?.description.ar ?? "");
  const [category, setCategory] = useState(editSeed?.category ?? "");
  const [basePriceInput, setBasePriceInput] = useState(
    editSeed ? String(editSeed.basePrice) : "",
  );
  const [discountInput, setDiscountInput] = useState(
    editSeed ? String(editSeed.discount) : "0",
  );
  const [isActive, setIsActive] = useState(editSeed?.isActive ?? true);
  const [sizeChartId, setSizeChartId] = useState(editSeed?.sizeChartId ?? "");
  const [variants, setVariants] = useState<ProductFormValues["variants"]>(
    editSeed?.variants ?? [{ size: "M", colors: [{ color: "Black", quantity: 0 }] }],
  );
  const [colorImages, setColorImages] = useState<
    Array<{ color: ProductColor; images: UploadItem[] }>
  >(
    editSeed
      ? editSeed.colorImages.map((entry) => ({
          color: entry.color,
          images: toUploadItems(entry.images),
        }))
      : [{ color: "Black", images: [] }],
  );
  const [mainImage, setMainImage] = useState<UploadItem[]>(
    editSeed?.mainImage ? toUploadItems([editSeed.mainImage]) : [],
  );
  const [secondaryImage, setSecondaryImage] = useState<UploadItem[]>(
    editSeed?.secondaryImage ? toUploadItems([editSeed.secondaryImage]) : [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const baselineValues = editSeed;
  const isFormReady = mode === "create" || editSeed !== null;
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    description: "",
    onConfirm: null,
  });
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const { data: activeSizeCharts = [], refetch: refetchActiveSizeCharts } = useQuery({
    queryKey: ["size-charts-active"],
    queryFn: fetchActiveSizeCharts,
  });

  const sizeChartOptions = useMemo(() => {
    const options = [...activeSizeCharts];
    const linked = initialProduct?.sizeChart;
    if (linked && !options.some((chart) => chart._id === linked._id)) {
      options.unshift(linked);
    }
    return options;
  }, [activeSizeCharts, initialProduct?.sizeChart]);

  const linkedSizeChartPreview = useMemo(() => {
    if (sizeChartId && initialProduct?.sizeChart?._id === sizeChartId) {
      return initialProduct.sizeChart;
    }
    return sizeChartOptions.find((chart) => chart._id === sizeChartId) ?? null;
  }, [initialProduct, sizeChartId, sizeChartOptions]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(event.target as Node)
      ) {
        setIsCategoryMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCategoryLabel = useMemo(() => {
    const selected = categories.find((item) => item._id === category);
    return selected ? selected.name?.en || selected.name?.ar : "";
  }, [categories, category]);

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((item) =>
      `${item.name?.en ?? ""} ${item.name?.ar ?? ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [categories, categorySearch]);

  const basePrice = Number(basePriceInput || 0);
  const discount = Number(discountInput || 0);
  const finalPrice = useMemo(() => {
    const safeDiscount = Math.min(Math.max(discount, 0), 100);
    return Math.max(0, basePrice - (basePrice * safeDiscount) / 100);
  }, [basePrice, discount]);

  const currentValues = useMemo<ProductFormValues>(
    () => ({
      title: { en: titleEn, ar: titleAr },
      description: { en: descriptionEn, ar: descriptionAr },
      category,
      basePrice,
      discount,
      finalPrice,
      isActive,
      mainImage: mainImage[0]?.uploadedUrl ?? "",
      secondaryImage: secondaryImage[0]?.uploadedUrl ?? "",
      colorImages: colorImages.map((entry) => ({
        color: entry.color,
        images: entry.images
          .filter((img) => !img.isUploading && img.uploadedUrl)
          .map((img) => img.uploadedUrl),
      })),
      variants,
      sizeChartId,
    }),
    [
      titleEn,
      titleAr,
      descriptionEn,
      descriptionAr,
      category,
      basePrice,
      discount,
      finalPrice,
      isActive,
      mainImage,
      secondaryImage,
      colorImages,
      variants,
      sizeChartId,
    ],
  );

  const uploadToCloudinary = async (file: File) => {
    if (!cloudName || !uploadPreset) {
      throw new Error(
        "Missing Cloudinary env vars: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.",
      );
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    const { data } = await axios.post<{ secure_url: string }>(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      formData,
    );
    return data.secure_url;
  };

  const uploadImages = async (
    files: File[],
    setter: Dispatch<SetStateAction<UploadItem[]>>,
    single = false,
  ) => {
    const newItems = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      previewUrl: URL.createObjectURL(file),
      uploadedUrl: "",
      isUploading: true,
    }));
    setter((prev) => (single ? newItems.slice(0, 1) : [...prev, ...newItems]));

    await Promise.all(
      newItems.map(async (item, index) => {
        try {
          const uploadedUrl = await uploadToCloudinary(files[index]);
          setter((prev) =>
            prev.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    uploadedUrl,
                    previewUrl: uploadedUrl,
                    isUploading: false,
                  }
                : entry,
            ),
          );
        } catch {
          setter((prev) => prev.filter((entry) => entry.id !== item.id));
          toast.error(`Failed to upload ${files[index].name}`);
        }
      }),
    );
  };

  const handleSingleImageUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    type: "main" | "secondary",
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (type === "main") await uploadImages([file], setMainImage, true);
    else await uploadImages([file], setSecondaryImage, true);
  };

  const handleColorImagesUpload = async (
    color: ProductColor,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const newItems = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      previewUrl: URL.createObjectURL(file),
      uploadedUrl: "",
      isUploading: true,
    }));
    setColorImages((prev) =>
      prev.map((entry) =>
        entry.color === color
          ? { ...entry, images: [...entry.images, ...newItems] }
          : entry,
      ),
    );

    await Promise.all(
      newItems.map(async (item, index) => {
        try {
          const uploadedUrl = await uploadToCloudinary(files[index]);
          setColorImages((prev) =>
            prev.map((entry) =>
              entry.color === color
                ? {
                    ...entry,
                    images: entry.images.map((img) =>
                      img.id === item.id
                        ? {
                            ...img,
                            uploadedUrl,
                            previewUrl: uploadedUrl,
                            isUploading: false,
                          }
                        : img,
                    ),
                  }
                : entry,
            ),
          );
        } catch {
          setColorImages((prev) =>
            prev.map((entry) =>
              entry.color === color
                ? {
                    ...entry,
                    images: entry.images.filter((img) => img.id !== item.id),
                  }
                : entry,
            ),
          );
          toast.error(`Failed to upload ${files[index].name}`);
        }
      }),
    );
  };

  const anyImageUploading = useMemo(() => {
    return (
      mainImage.some((img) => img.isUploading) ||
      secondaryImage.some((img) => img.isUploading) ||
      colorImages.some((entry) => entry.images.some((img) => img.isUploading))
    );
  }, [mainImage, secondaryImage, colorImages]);

  const removeColorImage = (color: ProductColor, imageId: string) => {
    setColorImages((prev) =>
      prev.map((entry) =>
        entry.color === color
          ? {
              ...entry,
              images: entry.images.filter((img) => img.id !== imageId),
            }
          : entry,
      ),
    );
  };

  const addColorGallery = () => {
    const nextColor = PRODUCT_COLORS.find(
      (candidate) => !colorImages.some((entry) => entry.color === candidate),
    );
    if (!nextColor) {
      toast.error("All colors are already added.");
      return;
    }
    setColorImages((prev) => [...prev, { color: nextColor, images: [] }]);
  };

  const updateColorGalleryColor = (
    oldColor: ProductColor,
    newColor: ProductColor,
  ) => {
    if (oldColor === newColor) return;
    if (colorImages.some((entry) => entry.color === newColor)) {
      toast.error("This color gallery already exists.");
      return;
    }
    setColorImages((prev) =>
      prev.map((entry) =>
        entry.color === oldColor ? { ...entry, color: newColor } : entry,
      ),
    );
    setVariants((prev) =>
      prev.map((variant) => ({
        ...variant,
        colors: variant.colors.map((entry) =>
          entry.color === oldColor ? { ...entry, color: newColor } : entry,
        ),
      })),
    );
  };

  const removeColorGallery = (color: ProductColor) => {
    if (colorImages.length === 1) {
      toast.error("At least one color gallery is required.");
      return;
    }
    setColorImages((prev) => prev.filter((entry) => entry.color !== color));
    setVariants((prev) =>
      prev.map((variant) => ({
        ...variant,
        colors: variant.colors.filter((entry) => entry.color !== color),
      })),
    );
  };

  const addSizeVariant = () => {
    const nextSize = PRODUCT_SIZES.find(
      (candidate) => !variants.some((variant) => variant.size === candidate),
    );
    if (!nextSize) {
      toast.error("All sizes are already added.");
      return;
    }
    const fallbackColor = colorImages[0]?.color ?? "Black";
    setVariants((prev) => [
      ...prev,
      { size: nextSize, colors: [{ color: fallbackColor, quantity: 0 }] },
    ]);
  };

  const updateVariantSize = (oldSize: ProductSize, newSize: ProductSize) => {
    if (oldSize === newSize) return;
    if (variants.some((variant) => variant.size === newSize)) {
      toast.error("This size already exists.");
      return;
    }
    setVariants((prev) =>
      prev.map((variant) =>
        variant.size === oldSize ? { ...variant, size: newSize } : variant,
      ),
    );
  };

  const removeVariantSize = (size: ProductSize) => {
    if (variants.length === 1) {
      toast.error("At least one size variant is required.");
      return;
    }
    setVariants((prev) => prev.filter((variant) => variant.size !== size));
  };

  const addVariantColor = (size: ProductSize) => {
    const variant = variants.find((entry) => entry.size === size);
    if (!variant) return;
    const availableColor = colorImages
      .map((entry) => entry.color)
      .find((color) => !variant.colors.some((entry) => entry.color === color));
    if (!availableColor) {
      toast.error("No available colors left for this size.");
      return;
    }
    setVariants((prev) =>
      prev.map((entry) =>
        entry.size === size
          ? {
              ...entry,
              colors: [...entry.colors, { color: availableColor, quantity: 0 }],
            }
          : entry,
      ),
    );
  };

  const updateVariantColor = (
    size: ProductSize,
    oldColor: ProductColor,
    newColor: ProductColor,
  ) => {
    if (oldColor === newColor) return;
    setVariants((prev) =>
      prev.map((entry) => {
        if (entry.size !== size) return entry;
        if (entry.colors.some((colorEntry) => colorEntry.color === newColor)) {
          toast.error("Color already exists in this size.");
          return entry;
        }
        return {
          ...entry,
          colors: entry.colors.map((colorEntry) =>
            colorEntry.color === oldColor
              ? { ...colorEntry, color: newColor }
              : colorEntry,
          ),
        };
      }),
    );
  };

  const updateVariantQuantity = (
    size: ProductSize,
    color: ProductColor,
    quantity: number,
  ) => {
    setVariants((prev) =>
      prev.map((entry) =>
        entry.size === size
          ? {
              ...entry,
              colors: entry.colors.map((colorEntry) =>
                colorEntry.color === color
                  ? { ...colorEntry, quantity: Math.max(0, quantity) }
                  : colorEntry,
              ),
            }
          : entry,
      ),
    );
  };

  const removeVariantColor = (size: ProductSize, color: ProductColor) => {
    setVariants((prev) =>
      prev.map((entry) =>
        entry.size === size
          ? {
              ...entry,
              colors:
                entry.colors.length === 1
                  ? entry.colors
                  : entry.colors.filter(
                      (colorEntry) => colorEntry.color !== color,
                    ),
            }
          : entry,
      ),
    );
  };

  const requestConfirm = (
    title: string,
    description: string,
    onConfirm: () => void,
  ) => {
    setConfirmDialog({
      open: true,
      title,
      description,
      onConfirm,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({
      open: false,
      title: "",
      description: "",
      onConfirm: null,
    });
  };

  const confirmDeleteAction = () => {
    if (confirmDialog.onConfirm) {
      confirmDialog.onConfirm();
    }
    closeConfirmDialog();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "edit" && !isFormReady) {
      toast.error("Product data is still loading. Please wait.");
      return;
    }
    if (anyImageUploading) {
      toast.error("Please wait until all image uploads finish.");
      return;
    }

    const validation = validateProductForm(currentValues);
    if (!validation.valid) {
      toast.error(validation.errors[0] ?? "Invalid form data.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "create") {
        const payload = buildCreateProductPayload(currentValues);
        await createProduct(payload);
        toast.success("Product created successfully.");
      } else if (mode === "edit" && productId && baselineValues) {
        const payload = buildUpdateProductPayload(baselineValues, currentValues);
        if (Object.keys(payload).length === 0) {
          toast.info("No changes to update.");
          setIsSubmitting(false);
          return;
        }
        await updateProduct(productId, payload);
        toast.success("Product updated successfully.");
      }
      router.push("/products");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string } | undefined)?.message ||
          "Failed to save product.";
        toast.error(message);
        if (
          message.toLowerCase().includes("size chart") &&
          message.toLowerCase().includes("active")
        ) {
          void refetchActiveSizeCharts();
        }
      } else {
        toast.error("Failed to save product.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          {mode === "create" ? "Add Product" : "Edit Product"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Basic Information
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={titleEn}
              onChange={(event) => setTitleEn(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Title (EN)"
              required
            />
            <input
              value={titleAr}
              onChange={(event) => setTitleAr(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Title (AR)"
              dir="rtl"
              required
            />
            <textarea
              value={descriptionEn}
              onChange={(event) => setDescriptionEn(event.target.value)}
              className="min-h-24 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Description (EN)"
              required
            />
            <textarea
              value={descriptionAr}
              onChange={(event) => setDescriptionAr(event.target.value)}
              className="min-h-24 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Description (AR)"
              dir="rtl"
              required
            />
          </div>
          <div ref={categoryMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
            >
              <span
                className={
                  selectedCategoryLabel ? "text-gray-900" : "text-gray-400"
                }
              >
                {selectedCategoryLabel || "Select category"}
              </span>
              <ChevronDown className="size-4 text-gray-500" />
            </button>
            {isCategoryMenuOpen && (
              <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 p-2">
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5">
                    <Search className="size-4 text-gray-400" />
                    <input
                      value={categorySearch}
                      onChange={(event) =>
                        setCategorySearch(event.target.value)
                      }
                      className="w-full border-none bg-transparent text-sm text-gray-800 outline-none"
                      placeholder="Search category..."
                    />
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto p-1">
                  {filteredCategories.map((item) => {
                    const label = item.name?.en || item.name?.ar;
                    const selected = category === item._id;
                    return (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => {
                          setCategory(item._id);
                          setIsCategoryMenuOpen(false);
                          setCategorySearch("");
                        }}
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <span>{label}</span>
                        {selected && <Check className="size-4 text-gray-900" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Size chart
          </h2>
          <p className="text-xs text-gray-500">
            Optional. Only active charts can be linked to new products.
          </p>
          <select
            value={sizeChartId}
            onChange={(event) => setSizeChartId(event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900 md:max-w-md"
          >
            <option value="">None</option>
            {sizeChartOptions.map((chart) => (
              <option key={chart._id} value={chart._id}>
                {getSizeChartDisplayName(chart)}
                {!chart.isActive ? " (inactive)" : ""}
              </option>
            ))}
          </select>
          {linkedSizeChartPreview && (
            <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-800">
                  {getSizeChartDisplayName(linkedSizeChartPreview)} ({linkedSizeChartPreview.unit})
                </p>
                <Link
                  href={`/size-charts/edit-size-chart?id=${linkedSizeChartPreview._id}`}
                  className="text-xs text-gray-600 underline hover:text-gray-900"
                >
                  Edit chart
                </Link>
              </div>
              <SizeChartPreview chart={linkedSizeChartPreview} />
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Pricing
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              type="number"
              min="0"
              value={basePriceInput}
              onChange={(event) => setBasePriceInput(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Base price"
              required
            />
            <input
              type="number"
              min="0"
              max="100"
              value={discountInput}
              onChange={(event) => setDiscountInput(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Discount %"
            />
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              Final price:{" "}
              <span className="font-semibold">{finalPrice.toFixed(2)}</span>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Product Images
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                key: "main" as const,
                title: "Main image",
                value: mainImage,
                setter: setMainImage,
              },
              {
                key: "secondary" as const,
                title: "Secondary image",
                value: secondaryImage,
                setter: setSecondaryImage,
              },
            ].map((entry) => (
              <div
                key={entry.key}
                className="rounded-lg border border-gray-200 p-3"
              >
                <p className="mb-2 text-sm font-medium text-gray-700">
                  {entry.title}
                </p>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700">
                  <Upload className="size-4" />
                  Upload {entry.title}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      handleSingleImageUpload(event, entry.key)
                    }
                  />
                </label>
                {entry.value[0] && (
                  <div className="relative mt-3 aspect-square overflow-hidden rounded-lg border border-gray-200">
                    <Image
                      src={entry.value[0].previewUrl}
                      alt={entry.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {entry.value[0].isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                        <Loader2 className="size-5 animate-spin text-white" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm(
                          `Remove ${entry.title}?`,
                          `This will remove the current ${entry.title.toLowerCase()} from the product.`,
                          () => entry.setter([]),
                        )
                      }
                      className="absolute right-1 top-1 rounded bg-white/90 p-1 text-red-600"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Color Galleries
            </h2>
            <button
              type="button"
              onClick={addColorGallery}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700"
            >
              <Plus className="size-4" />
              Add color gallery
            </button>
          </div>

          {colorImages.map((entry) => (
            <div
              key={entry.color}
              className="rounded-lg border border-gray-200 p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <select
                  value={entry.color}
                  onChange={(event) =>
                    updateColorGalleryColor(
                      entry.color,
                      event.target.value as ProductColor,
                    )
                  }
                  className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                >
                  {PRODUCT_COLORS.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    requestConfirm(
                      "Delete color gallery?",
                      `This will remove the ${entry.color} gallery and related variant color entries.`,
                      () => removeColorGallery(entry.color),
                    )
                  }
                  className="rounded p-1 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700">
                <Upload className="size-4" />
                Upload images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) =>
                    handleColorImagesUpload(entry.color, event)
                  }
                />
              </label>

              <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-5">
                {entry.images.map((image) => (
                  <div
                    key={image.id}
                    className="relative aspect-square overflow-hidden rounded-lg border border-gray-200"
                  >
                    <Image
                      src={image.previewUrl}
                      alt={entry.color}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {image.isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                        <Loader2 className="size-5 animate-spin text-white" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm(
                          "Delete image?",
                          `This will remove this image from ${entry.color} gallery.`,
                          () => removeColorImage(entry.color, image.id),
                        )
                      }
                      className="absolute right-1 top-1 rounded bg-white/90 p-1 text-red-600"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Variants (size -&gt; colors -&gt; quantity)
            </h2>
            <button
              type="button"
              onClick={addSizeVariant}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700"
            >
              <Plus className="size-4" />
              Add size
            </button>
          </div>

          {variants.map((variant) => (
            <div
              key={variant.size}
              className="rounded-lg border border-gray-200 p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <select
                    value={variant.size}
                    onChange={(event) =>
                      updateVariantSize(
                        variant.size,
                        event.target.value as ProductSize,
                      )
                    }
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    {PRODUCT_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      requestConfirm(
                        "Delete size variant?",
                        `This will remove size ${variant.size} and all of its colors/quantities.`,
                        () => removeVariantSize(variant.size),
                      )
                    }
                    className="rounded p-1 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => addVariantColor(variant.size)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-700"
                >
                  <Plus className="size-3.5" />
                  Add color
                </button>
              </div>

              <div className="space-y-2">
                {variant.colors.map((entry) => (
                  <div
                    key={`${variant.size}-${entry.color}`}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-2 py-1">
                      <span
                        className="size-3 rounded-full border border-black/10"
                        style={{ backgroundColor: colorSwatches[entry.color] }}
                      />
                      <select
                        value={entry.color}
                        onChange={(event) =>
                          updateVariantColor(
                            variant.size,
                            entry.color,
                            event.target.value as ProductColor,
                          )
                        }
                        className="border-none bg-transparent text-xs outline-none"
                      >
                        {colorImages.map((gallery) => (
                          <option key={gallery.color} value={gallery.color}>
                            {gallery.color}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={entry.quantity}
                      onChange={(event) =>
                        updateVariantQuantity(
                          variant.size,
                          entry.color,
                          Number(event.target.value || 0),
                        )
                      }
                      className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                      placeholder="Quantity"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm(
                          "Delete variant color?",
                          `This will remove color ${entry.color} from size ${variant.size}.`,
                          () => removeVariantColor(variant.size, entry.color),
                        )
                      }
                      className="rounded p-1 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
          <span className="text-sm text-gray-700">Product is active</span>
          <button
            type="button"
            onClick={() => setIsActive((prev) => !prev)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              isActive
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isFormReady}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSubmitting
            ? mode === "create"
              ? "Creating..."
              : "Updating..."
            : !isFormReady
              ? "Loading..."
              : mode === "create"
                ? "Create product"
                : "Update product"}
        </button>
      </form>

      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">
              {confirmDialog.title}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {confirmDialog.description}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirmDialog}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAction}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
