"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Category, useCategoryStore } from "../store/categoryStore";

export default function CategoryPage() {
  const router = useRouter();
  const categories = useCategoryStore((state) => state.categories);
  const isLoading = useCategoryStore((state) => state.isLoading);
  const error = useCategoryStore((state) => state.error);
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);
  const deleteCategory = useCategoryStore((state) => state.deleteCategory);
  const toggleCategoryStatus = useCategoryStore(
    (state) => state.toggleCategoryStatus
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingCategoryId, setTogglingCategoryId] = useState("");
  const pageSize = 5;

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const filteredCategories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return categories;

    return categories.filter((category) => {
      return (
        category._id.toLowerCase().includes(term) ||
        category.name.en.toLowerCase().includes(term) ||
        category.name.ar.toLowerCase().includes(term) ||
        category.slug.toLowerCase().includes(term)
      );
    });
  }, [categories, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCategories.length / pageSize),
  );
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCategories = filteredCategories.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      toast.error("NEXT_PUBLIC_API_URL is not set.");
      return;
    }

    setIsDeleting(true);

    try {
      await deleteCategory(deletingCategory._id);
      setDeletingCategory(null);
      toast.success("Category deleted successfully.");
    } catch {
      toast.error("Failed to delete category.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleCategoryStatus = async (category: Category) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      toast.error("NEXT_PUBLIC_API_URL is not set.");
      return;
    }

    const nextIsActive = !category.isActive;
    setTogglingCategoryId(category._id);

    try {
      await toggleCategoryStatus(category._id, nextIsActive);
      toast.success("Category status updated.");
    } catch {
      await fetchCategories();
      toast.error("Failed to update category status.");
    } finally {
      setTogglingCategoryId("");
    }
  };

  return (
    <section className="min-h-full bg-gray-50 p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
            <p className="text-sm text-gray-500">
              Manage category names, slugs, images, and status.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/category/add-category")}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black"
          >
            Add Category
          </button>
        </header>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {isLoading && (
            <p className="border-b border-gray-200 px-4 py-3 text-sm text-gray-500">
              Loading categories...
            </p>
          )}
          {Boolean(error) && (
            <p className="border-b border-gray-200 px-4 py-3 text-sm text-red-600">
              {error || "Failed to load categories."}
            </p>
          )}
          <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-500">
              Showing {paginatedCategories.length} of{" "}
              {filteredCategories.length} categories
            </p>
            <input
              value={searchTerm}
              onChange={(event) => handleSearch(event.target.value)}
              type="search"
              placeholder="Search by id, name, or slug..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-0 placeholder:text-gray-400 focus:border-gray-500 md:w-80"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="border-b border-gray-200 bg-gray-100 text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Image</th>
                  <th className="px-4 py-3 font-semibold">Name (EN)</th>
                  <th className="px-4 py-3 font-semibold">Name (AR)</th>
                  <th className="px-4 py-3 font-semibold">Slug</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {paginatedCategories.map((category) => (
                  <tr
                    key={category._id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {category._id}
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="h-12 w-12 rounded-md border border-gray-200 bg-cover bg-center"
                        style={{ backgroundImage: `url(${category.image})` }}
                        aria-label={`${category.name.en} image`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {category.name.en}
                    </td>
                    <td className="px-4 py-3" dir="rtl">
                      {category.name.ar}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{category.slug}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleCategoryStatus(category)}
                        disabled={togglingCategoryId === category._id}
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                          category.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                      >
                        {togglingCategoryId === category._id
                          ? "Updating..."
                          : category.isActive
                            ? "Active"
                            : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/category/add-category?id=${category._id}`,
                          )
                        }
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingCategory(category);
                        }}
                        className="ml-2 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {paginatedCategories.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-sm text-gray-500"
                      colSpan={7}
                    >
                      No categories found for this search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              Page {safePage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={safePage === 1}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-100"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={safePage === totalPages}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              Delete Category
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-medium text-gray-900">
                {deletingCategory.name.en}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeletingCategory(null);
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
