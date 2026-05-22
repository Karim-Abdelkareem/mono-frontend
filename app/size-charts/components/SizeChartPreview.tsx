"use client";

import { PRODUCT_SIZES } from "@/app/store/productStore";
import { SizeChart } from "@/app/lib/types/sizeChart";

type SizeChartPreviewProps = {
  chart: Pick<SizeChart, "rows" | "unit">;
  className?: string;
};

export default function SizeChartPreview({ chart, className = "" }: SizeChartPreviewProps) {
  const usedSizes = PRODUCT_SIZES.filter((size) =>
    chart.rows.some((row) => row.values.some((entry) => entry.size === size)),
  );

  if (!chart.rows.length || !usedSizes.length) {
    return (
      <p className={`text-sm text-gray-500 ${className}`.trim()}>
        No measurements defined yet.
      </p>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`.trim()}>
      <table className="w-full min-w-[480px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <th className="px-3 py-2 font-medium">Measurement</th>
            {usedSizes.map((size) => (
              <th key={size} className="px-3 py-2 font-medium text-center">
                {size}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {chart.rows.map((row, index) => {
            const label = row.label.en?.trim() || row.label.ar?.trim() || `Row ${index + 1}`;
            const valueBySize = new Map(row.values.map((entry) => [entry.size, entry.value]));
            return (
              <tr key={`${label}-${index}`}>
                <td className="px-3 py-2 font-medium text-gray-900">{label}</td>
                {usedSizes.map((size) => {
                  const value = valueBySize.get(size);
                  return (
                    <td key={size} className="px-3 py-2 text-center text-gray-700">
                      {value !== undefined ? (
                        <>
                          {value} <span className="text-xs text-gray-400">{chart.unit}</span>
                        </>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
