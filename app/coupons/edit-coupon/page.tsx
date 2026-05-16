"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import CouponForm from "../components/CouponForm";
import { Coupon, getApiErrorMessage, getCouponById } from "@/app/lib/couponService";

export default function EditCouponPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const couponId = searchParams.get("id");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCoupon = async () => {
      if (!couponId) {
        toast.error("Missing coupon id.");
        router.replace("/coupons");
        return;
      }

      setIsLoading(true);
      try {
        const data = await getCouponById(couponId);
        if (!data) {
          toast.error("Coupon not found.");
          router.replace("/coupons");
          return;
        }
        setCoupon(data);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to load coupon."));
        router.replace("/coupons");
      } finally {
        setIsLoading(false);
      }
    };

    void loadCoupon();
  }, [couponId, router]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
        <p className="text-sm text-gray-500">Loading coupon...</p>
      </div>
    );
  }

  if (!coupon || !couponId) return null;

  return <CouponForm mode="edit" couponId={couponId} initialCoupon={coupon} />;
}
