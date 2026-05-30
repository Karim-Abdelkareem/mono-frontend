"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ProductForm from "../components/ProductForm";
import { ProductEntity, useProductStore } from "@/app/store/productStore";

export default function EditProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("id");
  const getProductById = useProductStore((state) => state.getProductById);
  const [product, setProduct] = useState<ProductEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
        <Link
          href="/products"
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="size-4" />
          Back to products
        </Link>
        <p className="text-sm text-gray-500">Loading product...</p>
      </div>
    );
  }

  if (!product || !productId) return null;
  return (
    <ProductForm
      key={productId}
      mode="edit"
      productId={productId}
      initialProduct={product}
    />
  );
}
