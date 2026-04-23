"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import Image from "next/image";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useCategoryStore } from "../../store/categoryStore";

export default function AddCategoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const getCategoryById = useCategoryStore((state) => state.getCategoryById);
  const createCategory = useCategoryStore((state) => state.createCategory);
  const updateCategory = useCategoryStore((state) => state.updateCategory);
  const categoryId = searchParams.get("id");
  const isEditMode = Boolean(categoryId);

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadedImagePreview = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : ""),
    [imageFile],
  );
  const imagePreview = uploadedImagePreview || existingImage;

  useEffect(() => {
    return () => {
      if (uploadedImagePreview) URL.revokeObjectURL(uploadedImagePreview);
    };
  }, [uploadedImagePreview]);

  useEffect(() => {
    const fetchCategoryForEdit = async () => {
      if (!categoryId) return;

      setIsLoadingCategory(true);
      try {
        const category = await getCategoryById(categoryId);
        if (!category) {
          toast.error("Category not found.");
          router.replace("/category");
          return;
        }

        setNameEn(category.name?.en ?? "");
        setNameAr(category.name?.ar ?? "");
        setIsActive(Boolean(category.isActive));
        setExistingImage(category.image ?? "");
      } catch {
        toast.error("Failed to load category.");
        router.replace("/category");
      } finally {
        setIsLoadingCategory(false);
      }
    };

    fetchCategoryForEdit();
  }, [categoryId, getCategoryById, router]);

  const pickFile = useCallback((file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
  }, []);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    pickFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    pickFile(event.dataTransfer.files?.[0] ?? null);
  };

  const openFileDialog = () => inputRef.current?.click();

  const clearImage = () => {
    setImageFile(null);
    setExistingImage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!imageFile && !existingImage) {
      toast.error("Please upload a category image.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append(
        "name",
        JSON.stringify({
          en: nameEn,
          ar: nameAr,
        }),
      );
      formData.append("isActive", String(isActive));
      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (isEditMode && categoryId) {
        await updateCategory(categoryId, formData);
      } else {
        await createCategory(formData);
      }

      toast.success(
        isEditMode
          ? "Category updated successfully."
          : "Category created successfully.",
      );
      setNameEn("");
      setNameAr("");
      setIsActive(true);
      setImageFile(null);
      setExistingImage("");
      router.push("/category");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string } | undefined)?.message ||
          (isEditMode
            ? "Failed to update category."
            : "Failed to create category.");
        toast.error(message);
      } else {
        toast.error(
          isEditMode
            ? "Failed to update category."
            : "Failed to create category.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-50">
      <header className="shrink-0 border-b border-gray-200 bg-white px-6 py-5 md:px-10">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isEditMode ? "Update Category" : "Add Category"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEditMode
            ? "Update category details and submit changes."
            : "Fill in the details and upload a category image."}
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col lg:flex-row"
      >
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto border-b border-gray-200 bg-white p-6 md:p-10 lg:max-w-xl lg:border-b-0 lg:border-r xl:max-w-lg">
          {isEditMode && isLoadingCategory && (
            <p className="text-sm text-gray-500">Loading category details...</p>
          )}
          <div className="grid gap-2">
            <label
              htmlFor="name-en"
              className="text-sm font-medium text-gray-800"
            >
              Name (EN)
            </label>
            <input
              id="name-en"
              value={nameEn}
              onChange={(event) => setNameEn(event.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm outline-none transition-colors focus:border-gray-900 focus:bg-white"
              placeholder="T-Shirts"
              required
            />
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="name-ar"
              className="text-sm font-medium text-gray-800"
            >
              Name (AR)
            </label>
            <input
              id="name-ar"
              value={nameAr}
              onChange={(event) => setNameAr(event.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm outline-none transition-colors focus:border-gray-900 focus:bg-white"
              placeholder="تيشيرتات"
              dir="rtl"
              required
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-800">
                Active category
              </span>
              <span className="text-xs text-gray-500">
                {isActive ? "Visible to customers" : "Hidden from customers"}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive((prev) => !prev)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${
                isActive ? "bg-gray-900" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block size-5 transform rounded-full bg-white shadow transition-transform ${
                  isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
              <span className="sr-only">Toggle category active state</span>
            </button>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                (!imageFile && !existingImage) ||
                isSubmitting ||
                isLoadingCategory
              }
            >
              {isSubmitting
                ? isEditMode
                  ? "Updating..."
                  : "Saving..."
                : isEditMode
                  ? "Update category"
                  : "Save category"}
            </button>
          </div>
        </div>

        <div className="flex min-h-[50vh] flex-1 flex-col bg-gray-100/60 p-6 md:p-10">
          <p className="mb-3 text-sm font-medium text-gray-800">
            Category image
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleImageChange}
            className="sr-only"
            aria-hidden
          />

          <div
            role="button"
            tabIndex={0}
            onClick={openFileDialog}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openFileDialog();
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${
              isDragging
                ? "border-gray-900 bg-white shadow-inner"
                : "border-gray-300 bg-white/80 hover:border-gray-500 hover:bg-white"
            }`}
          >
            {imagePreview ? (
              <>
                <div className="relative size-full min-h-[280px]">
                  <Image
                    src={imagePreview}
                    alt="Category preview"
                    fill
                    className="object-contain p-6"
                    unoptimized
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-linear-to-t from-white via-white/95 to-transparent p-6 pt-16">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openFileDialog();
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50"
                  >
                    <Upload className="size-4" aria-hidden />
                    Replace image
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      clearImage();
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Remove
                  </button>
                </div>
              </>
            ) : (
              <div className="flex max-w-sm flex-col items-center gap-4 px-6 py-12 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-gray-100 text-gray-700">
                  <ImagePlus className="size-8" strokeWidth={1.5} aria-hidden />
                </div>
                <div>
                  <p className="text-base font-medium text-gray-900">
                    Drop an image here
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    or click to browse — PNG, JPG, WebP, GIF
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white">
                  <Upload className="size-4" aria-hidden />
                  Choose file
                </span>
              </div>
            )}
          </div>

          {!imageFile && (
            <p className="mt-2 text-xs text-gray-500">
              Image is required before you can save the category.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
