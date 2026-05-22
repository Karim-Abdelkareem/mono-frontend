"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import SizeChartForm from "../components/SizeChartForm";
import { getApiErrorMessage, getSizeChartById } from "@/app/lib/sizeChartService";
import { SizeChart } from "@/app/lib/types/sizeChart";

export default function EditSizeChartPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chartId = searchParams.get("id");
  const [chart, setChart] = useState<SizeChart | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!chartId) {
        toast.error("Missing size chart id.");
        router.replace("/size-charts");
        return;
      }
      setIsLoading(true);
      try {
        const data = await getSizeChartById(chartId);
        if (!data) {
          toast.error("Size chart not found.");
          router.replace("/size-charts");
          return;
        }
        setChart(data);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to load size chart."));
        router.replace("/size-charts");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [chartId, router]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
        <p className="text-sm text-gray-500">Loading size chart...</p>
      </div>
    );
  }

  if (!chart || !chartId) return null;

  return <SizeChartForm key={chartId} mode="edit" chartId={chartId} initialChart={chart} />;
}
