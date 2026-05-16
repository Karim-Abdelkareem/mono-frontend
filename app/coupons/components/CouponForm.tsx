"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  Coupon,
  CouponType,
  createCoupon,
  formatCouponValue,
  formatUsage,
  getApiErrorMessage,
  getCouponDisplayState,
  couponStateBadgeClass,
  isCouponRestricted,
  updateCoupon,
} from "@/app/lib/couponService";

type CouponFormValues = {
  code: string;
  type: CouponType;
  value: string;
  minOrderAmount: string;
  maxUsages: string;
  expiryDays: string;
  expiresAt: string;
  createdForEmail: string;
  isActive: boolean;
};

type CouponFormProps = {
  mode: "create" | "edit";
  couponId?: string;
  initialCoupon?: Coupon;
};

function formatDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateInputValue(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

const inputClass =
  "rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900/10 disabled:cursor-not-allowed disabled:opacity-60";

export default function CouponForm({ mode, couponId, initialCoupon }: CouponFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CouponFormValues, string>>>({});
  const [values, setValues] = useState<CouponFormValues>({
    code: initialCoupon?.code ?? "",
    type: initialCoupon?.type ?? "percent",
    value: String(initialCoupon?.value ?? ""),
    minOrderAmount: String(initialCoupon?.minOrderAmount ?? 0),
    maxUsages: String(initialCoupon?.maxUsages ?? 1),
    expiryDays: "90",
    expiresAt: toDateInputValue(initialCoupon?.expiresAt),
    createdForEmail: initialCoupon?.createdForEmail ?? "",
    isActive: initialCoupon?.isActive ?? true,
  });

  const pageTitle = mode === "create" ? "Create coupon" : "Edit coupon";

  const parsed = useMemo(
    () => ({
      value: Number(values.value),
      minOrderAmount: Number(values.minOrderAmount),
      maxUsages: Number(values.maxUsages),
      expiryDays: Number(values.expiryDays),
    }),
    [values],
  );

  const validate = () => {
    const nextErrors: Partial<Record<keyof CouponFormValues, string>> = {};

    if (mode === "create" && !values.code.trim()) {
      nextErrors.code = "Coupon code is required.";
    }
    if (!Number.isFinite(parsed.value) || parsed.value < 0) {
      nextErrors.value = "Value must be 0 or greater.";
    }
    if (values.type === "percent" && parsed.value > 100) {
      nextErrors.value = "Percent value cannot exceed 100.";
    }
    if (!Number.isFinite(parsed.minOrderAmount) || parsed.minOrderAmount < 0) {
      nextErrors.minOrderAmount = "Min order must be 0 or greater.";
    }
    if (!Number.isFinite(parsed.maxUsages) || parsed.maxUsages < 0) {
      nextErrors.maxUsages = "Max usages must be 0 (unlimited) or greater.";
    }
    if (mode === "create") {
      if (!Number.isFinite(parsed.expiryDays) || parsed.expiryDays < 1) {
        nextErrors.expiryDays = "Expiry must be at least 1 day.";
      }
    } else if (!values.expiresAt) {
      nextErrors.expiresAt = "Expiry date is required.";
    }
    if (values.createdForEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.createdForEmail)) {
      nextErrors.createdForEmail = "Enter a valid email or leave empty.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (mode === "create") {
        const created = await createCoupon({
          code: values.code.trim().toUpperCase(),
          type: values.type,
          value: parsed.value,
          minOrderAmount: parsed.minOrderAmount,
          maxUsages: parsed.maxUsages,
          expiryDays: parsed.expiryDays,
          createdForEmail: values.createdForEmail.trim() || null,
        });
        toast.success(`Coupon ${created.code} created.`);
      } else if (couponId) {
        await updateCoupon(couponId, {
          type: values.type,
          value: parsed.value,
          minOrderAmount: parsed.minOrderAmount,
          maxUsages: parsed.maxUsages,
          expiresAt: new Date(values.expiresAt).toISOString(),
          isActive: values.isActive,
          createdForEmail: values.createdForEmail.trim() || null,
        });
        toast.success("Coupon updated successfully.");
      }
      router.push("/coupons");
      router.refresh();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          mode === "create" ? "Failed to create coupon." : "Failed to update coupon.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayState = initialCoupon ? getCouponDisplayState(initialCoupon) : null;

  return (
    <div className="w-full px-4 py-6 md:px-8">
      <div className="mb-6">
        <Link
          href="/coupons"
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="size-4" />
          Back to coupons
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">{pageTitle}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {mode === "create"
            ? "Set code, discount type, limits, and optional email restriction."
            : "Update discount settings. Usage stats are managed by orders."}
        </p>
      </div>

      {mode === "edit" && initialCoupon ? (
        <div className="mb-6 grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Code</p>
            <p className="mt-1 font-mono text-sm font-semibold text-gray-900">
              {initialCoupon.code}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Discount</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {formatCouponValue(initialCoupon)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Usage</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {formatUsage(initialCoupon)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">State</p>
            {displayState ? (
              <span
                className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${couponStateBadgeClass(displayState)}`}
              >
                {displayState}
              </span>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Expires</p>
            <p className="mt-1 text-sm text-gray-700">{formatDateTime(initialCoupon.expiresAt)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Orders used
            </p>
            <p className="mt-1 text-sm text-gray-700">
              {initialCoupon.usedInOrders?.length ?? 0} order
              {(initialCoupon.usedInOrders?.length ?? 0) === 1 ? "" : "s"}
            </p>
          </div>
          {isCouponRestricted(initialCoupon) ? (
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Restricted to
              </p>
              <p className="mt-1 text-sm text-gray-700">
                {initialCoupon.createdForEmail || initialCoupon.createdForUser || "—"}
              </p>
            </div>
          ) : (
            <div className="sm:col-span-2 lg:col-span-4">
              <span className="inline-flex rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                Public coupon
              </span>
            </div>
          )}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-5 md:grid-cols-2">
          {mode === "create" ? (
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-sm font-medium text-gray-700">Code</span>
              <input
                type="text"
                value={values.code}
                onChange={(e) => setValues((p) => ({ ...p, code: e.target.value }))}
                onBlur={(e) =>
                  setValues((p) => ({ ...p, code: e.target.value.trim().toUpperCase() }))
                }
                disabled={isSubmitting}
                placeholder="SAVE20"
                className={`${inputClass} font-mono uppercase`}
              />
              {errors.code ? <span className="text-xs text-red-600">{errors.code}</span> : null}
            </label>
          ) : null}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">Type</span>
            <select
              value={values.type}
              onChange={(e) =>
                setValues((p) => ({ ...p, type: e.target.value as CouponType }))
              }
              disabled={isSubmitting}
              className={inputClass}
            >
              <option value="percent">Percent (%)</option>
              <option value="fixed">Fixed (EGP)</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">
              Value {values.type === "percent" ? "(%)" : "(EGP)"}
            </span>
            <input
              type="number"
              min="0"
              step={values.type === "percent" ? "1" : "0.01"}
              max={values.type === "percent" ? "100" : undefined}
              value={values.value}
              onChange={(e) => setValues((p) => ({ ...p, value: e.target.value }))}
              disabled={isSubmitting}
              className={inputClass}
            />
            {errors.value ? <span className="text-xs text-red-600">{errors.value}</span> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">Min order (EGP)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.minOrderAmount}
              onChange={(e) => setValues((p) => ({ ...p, minOrderAmount: e.target.value }))}
              disabled={isSubmitting}
              className={inputClass}
            />
            {errors.minOrderAmount ? (
              <span className="text-xs text-red-600">{errors.minOrderAmount}</span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">Max usages</span>
            <input
              type="number"
              min="0"
              step="1"
              value={values.maxUsages}
              onChange={(e) => setValues((p) => ({ ...p, maxUsages: e.target.value }))}
              disabled={isSubmitting}
              className={inputClass}
            />
            <span className="text-xs text-gray-500">Use 0 for unlimited</span>
            {errors.maxUsages ? (
              <span className="text-xs text-red-600">{errors.maxUsages}</span>
            ) : null}
          </label>

          {mode === "create" ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700">Expiry (days)</span>
              <input
                type="number"
                min="1"
                step="1"
                value={values.expiryDays}
                onChange={(e) => setValues((p) => ({ ...p, expiryDays: e.target.value }))}
                disabled={isSubmitting}
                className={inputClass}
              />
              {errors.expiryDays ? (
                <span className="text-xs text-red-600">{errors.expiryDays}</span>
              ) : null}
            </label>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-700">Expires on</span>
                <input
                  type="date"
                  value={values.expiresAt}
                  onChange={(e) => setValues((p) => ({ ...p, expiresAt: e.target.value }))}
                  disabled={isSubmitting}
                  className={inputClass}
                />
                {errors.expiresAt ? (
                  <span className="text-xs text-red-600">{errors.expiresAt}</span>
                ) : null}
              </label>
              <label className="flex items-center gap-2 pt-8">
                <input
                  type="checkbox"
                  checked={values.isActive}
                  onChange={(e) => setValues((p) => ({ ...p, isActive: e.target.checked }))}
                  disabled={isSubmitting}
                  className="size-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </>
          )}

          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-sm font-medium text-gray-700">
              Restrict to email <span className="font-normal text-gray-400">(optional)</span>
            </span>
            <input
              type="email"
              value={values.createdForEmail}
              onChange={(e) => setValues((p) => ({ ...p, createdForEmail: e.target.value }))}
              disabled={isSubmitting}
              placeholder="customer@example.com"
              className={inputClass}
            />
            {errors.createdForEmail ? (
              <span className="text-xs text-red-600">{errors.createdForEmail}</span>
            ) : null}
          </label>
        </div>

        <div className="mt-6 flex items-center gap-2 border-t border-gray-100 pt-5">
          <button
            type="button"
            onClick={() => router.push("/coupons")}
            disabled={isSubmitting}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
          >
            {isSubmitting
              ? mode === "create"
                ? "Creating…"
                : "Saving…"
              : mode === "create"
                ? "Create coupon"
                : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
