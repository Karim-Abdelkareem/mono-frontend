"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { ArrowDownAZ, ArrowUpAZ, Pencil, Plus, Trash2 } from "lucide-react";
import { useProductStore } from "@/app/store/productStore";
import { toast } from "sonner";

function shortCategory(value: string) {
  if (!value) return "-";
  return value.length > 10 ? `${value.slice(0, 10)}...` : value;
}

function getTotalStock(product: {
  variants: Array<{ colors: Array<{ quantity: number }> }>;
}) {
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

export default function ProductsPage() {
  const products = useProductStore((state) => state.products);
  const isLoading = useProductStore((state) => state.isLoading);
  const error = useProductStore((state) => state.error);
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const deleteProduct = useProductStore((state) => state.deleteProduct);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<"title" | "price" | "stock">("title");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((product) => product.categoryName || shortCategory(product.category))
          .filter(Boolean),
      ),
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const title = (product.title?.en || product.title?.ar || "").toLowerCase();
      const matchesSearch =
        !query ||
        title.includes(query) ||
        (product.categoryName || "").toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? product.isActive : !product.isActive);
      const matchesCategory =
        categoryFilter === "all" ||
        (product.categoryName || shortCategory(product.category)) === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [products, search, statusFilter, categoryFilter]);

  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts].sort((a, b) => {
      if (sortBy === "price") {
        return Number(a.finalPrice || 0) - Number(b.finalPrice || 0);
      }
      if (sortBy === "stock") {
        return getTotalStock(a) - getTotalStock(b);
      }
      const titleA = (a.title?.en || a.title?.ar || "").toLowerCase();
      const titleB = (b.title?.en || b.title?.ar || "").toLowerCase();
      return titleA.localeCompare(titleB);
    });
    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [filteredProducts, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  const handleDeleteProduct = async (id: string, title: string) => {
    const confirmed = window.confirm(`Delete "${title}"? This action cannot be undone.`);
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await deleteProduct(id);
      toast.success("Product deleted.");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string } | undefined)?.message ||
          "Failed to delete product.";
        toast.error(message);
      } else {
        toast.error("Failed to delete product.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto w-full px-4 py-6 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">Important product data overview.</p>
        </div>
        <Link
          href="/products/add-product"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          <Plus className="size-4" />
          Add product
        </Link>
      </div>

      <div className="mb-4 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-6">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search by title or category..."
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
        />
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as "all" | "active" | "inactive");
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(event) => {
            setCategoryFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
        >
          <option value="all">All categories</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {shortCategory(option)}
            </option>
          ))}
        </select>
        <select
          value={String(pageSize)}
          onChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
        >
          <option value="5">5 / page</option>
          <option value="10">10 / page</option>
          <option value="20">20 / page</option>
          <option value="50">50 / page</option>
        </select>
        <select
          value={sortBy}
          onChange={(event) => {
            setSortBy(event.target.value as "title" | "price" | "stock");
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
        >
          <option value="title">Sort by Title</option>
          <option value="price">Sort by Price</option>
          <option value="stock">Sort by Stock</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
            setPage(1);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          {sortDirection === "asc" ? (
            <>
              <ArrowUpAZ className="size-4" />
              Ascending
            </>
          ) : (
            <>
              <ArrowDownAZ className="size-4" />
              Descending
            </>
          )}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  Loading products...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-red-600">
                  {error}
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  No products found for current filters.
                </td>
              </tr>
            ) : (
              paginatedProducts.map((product) => {
                const totalStock = getTotalStock(product);
                const title = product.title?.en || product.title?.ar || "Untitled";
                const thumbnail =
                  product.mainImage ||
                  product.productImagesAndVideos.find((item) => item.type === "image")
                    ?.url ||
                  "";
                return (
                  <tr key={product._id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative size-12 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                          {thumbnail ? (
                            <Image
                              src={thumbnail}
                              alt={title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">{title}</p>
                          <p className="text-xs text-gray-500">{product.variants.length} sizes</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {product.categoryName || shortCategory(product.category)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>${Number(product.finalPrice || 0).toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        Base ${Number(product.basePrice || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{totalStock}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          product.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/products/edit-product?id=${product._id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product._id, title)}
                          disabled={deletingId === product._id}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" />
                          {deletingId === product._id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && !error && filteredProducts.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">
          <p className="text-gray-600">
            Showing {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, sortedProducts.length)} of{" "}
            {sortedProducts.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-gray-600">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
