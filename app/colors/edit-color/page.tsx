"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ColorForm from "../components/ColorForm";
import { getApiErrorMessage, getColorById } from "@/app/lib/colorService";
import { PaletteColor } from "@/app/lib/types/color";

export default function EditColorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const colorId = searchParams.get("id");
  const [color, setColor] = useState<PaletteColor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!colorId) {
        toast.error("Missing color id.");
        router.replace("/colors");
        return;
      }
      setIsLoading(true);
      try {
        const data = await getColorById(colorId);
        if (!data) {
          toast.error("Color not found.");
          router.replace("/colors");
          return;
        }
        setColor(data);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to load color."));
        router.replace("/colors");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [colorId, router]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8">
        <p className="text-sm text-gray-500">Loading color...</p>
      </div>
    );
  }

  if (!color || !colorId) return null;

  return <ColorForm key={colorId} mode="edit" colorId={colorId} initialColor={color} />;
}
