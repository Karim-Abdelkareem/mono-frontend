"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  createColor,
  getApiErrorMessage,
  updateColor,
} from "@/app/lib/colorService";
import { PaletteColor } from "@/app/lib/types/color";

type ColorFormProps = {
  mode: "create" | "edit";
  colorId?: string;
  initialColor?: PaletteColor;
};

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900";

export default function ColorForm({ mode, colorId, initialColor }: ColorFormProps) {
  const router = useRouter();
  const [nameEn, setNameEn] = useState(initialColor?.name.en ?? "");
  const [nameAr, setNameAr] = useState(initialColor?.name.ar ?? "");
  const [hexCode, setHexCode] = useState(initialColor?.hexCode ?? "#000000");
  const [isActive, setIsActive] = useState(initialColor?.isActive ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!nameEn.trim()) {
      toast.error("English name is required.");
      return;
    }
    if (!/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(hexCode.trim())) {
      toast.error("Enter a valid hex color (e.g. #FF5733).");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: { en: nameEn.trim(), ar: nameAr.trim() || undefined },
        hexCode: hexCode.trim(),
        isActive,
      };
      if (mode === "create") {
        await createColor(payload);
        toast.success("Color created.");
      } else if (colorId) {
        await updateColor(colorId, payload);
        toast.success("Color updated.");
      }
      router.push("/colors");
      router.refresh();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          mode === "create" ? "Failed to create color." : "Failed to update color.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8">
      <Link
        href="/colors"
        className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="size-4" />
        Back to colors
      </Link>

      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        {mode === "create" ? "Add color" : "Edit color"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Name (EN)</span>
            <input
              value={nameEn}
              onChange={(event) => setNameEn(event.target.value)}
              className={inputClass}
              placeholder="Petroleum"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Name (AR)</span>
            <input
              value={nameAr}
              onChange={(event) => setNameAr(event.target.value)}
              className={inputClass}
              dir="rtl"
              placeholder="بترولي"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-end">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Pick color</span>
            <input
              type="color"
              value={hexCode.length === 7 ? hexCode : "#000000"}
              onChange={(event) => setHexCode(event.target.value)}
              className="h-11 w-16 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Hex code</span>
            <input
              value={hexCode}
              onChange={(event) => setHexCode(event.target.value)}
              className={inputClass}
              placeholder="#005F6A"
            />
          </label>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
          <span className="text-sm text-gray-700">Active</span>
          <button
            type="button"
            onClick={() => setIsActive((prev) => !prev)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="size-10 rounded-full border border-black/10"
            style={{ backgroundColor: hexCode }}
          />
          <span className="text-sm text-gray-600">Preview swatch</span>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          {isSubmitting
            ? "Saving..."
            : mode === "create"
              ? "Create color"
              : "Save changes"}
        </button>
      </form>
    </div>
  );
}
