"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import ProductView from "../components/ProductView";
import { getColors } from "@/app/lib/colorService";
import { ProductEntity, useProductStore } from "@/app/store/productStore";

export default function ViewProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("id");
  const getProductById = useProductStore((state) => state.getProductById);
  const deleteProduct = useProductStore((state) => state.deleteProduct);
  const [product, setProduct] = useState<ProductEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: palette = [] } = useQuery({
    queryKey: ["colors"],
    queryFn: getColors,
  });

  const paletteById = useMemo(
    () => new Map(palette.map((color) => [color._id, color])),
    [palette],
  );

  useEffect(() => {
    const load = async () => {
      if (!productId) {
        toast.error("Missing product id.");
        router.replace("/products");
        return;
      }
      setIsLoading(true);
      try {
        const data = await getProductById(productId);
        if (!data) {
          toast.error("Product not found.");
          router.replace("/products");
          return;
        }
        setProduct(data);
      } catch {
        toast.error("Failed to load product.");
        router.replace("/products");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [getProductById, productId, router]);

  const handleDelete = async () => {
    if (!product) return;
    const title = product.title?.en || product.title?.ar || "this product";
    const confirmed = window.confirm(`Delete "${title}"? This action cannot be undone.`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteProduct(product._id);
      toast.success("Product deleted.");
      router.push("/products");
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
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
        <p className="text-sm text-gray-500">Loading product...</p>
      </div>
    );
  }

  if (!product || !productId) return null;

  return (
    <ProductView
      product={product}
      paletteById={paletteById}
      onDelete={handleDelete}
      isDeleting={isDeleting}
    />
  );
}
