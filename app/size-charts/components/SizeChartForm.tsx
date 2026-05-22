"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createSizeChart,
  getApiErrorMessage,
  updateSizeChart,
} from "@/app/lib/sizeChartService";
import {
  SizeChart,
  SizeChartRow,
  SizeChartSize,
  SizeChartUnit,
} from "@/app/lib/types/sizeChart";
import { PRODUCT_SIZES } from "@/app/store/productStore";
import SizeChartPreview from "./SizeChartPreview";

type EditorRow = {
  id: string;
  labelEn: string;
  labelAr: string;
  values: Partial<Record<SizeChartSize, string>>;
};

type SizeChartFormProps = {
  mode: "create" | "edit";
  chartId?: string;
  initialChart?: SizeChart;
};

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900";

function rowsFromChart(chart?: SizeChart): EditorRow[] {
  if (!chart?.rows.length) {
    return [
      {
        id: "row-1",
        labelEn: "",
        labelAr: "",
        values: {},
      },
    ];
  }
  return chart.rows.map((row, index) => {
    const values: Partial<Record<SizeChartSize, string>> = {};
    row.values.forEach((entry) => {
      values[entry.size] = String(entry.value);
    });
    return {
      id: `row-${index}-${row.label.en ?? "measurement"}`,
      labelEn: row.label.en ?? "",
      labelAr: row.label.ar ?? "",
      values,
    };
  });
}

function buildRowsPayload(editorRows: EditorRow[]): SizeChartRow[] {
  return editorRows
    .map((row) => {
      const label = {
        en: row.labelEn.trim(),
        ar: row.labelAr.trim() || undefined,
      };
      const values = PRODUCT_SIZES.flatMap((size) => {
        const raw = row.values[size]?.trim();
        if (!raw) return [];
        const value = Number(raw);
        if (!Number.isFinite(value)) return [];
        return [{ size, value }];
      });
      return { label, values };
    })
    .filter((row) => row.label.en || row.label.ar);
}

export default function SizeChartForm({ mode, chartId, initialChart }: SizeChartFormProps) {
  const router = useRouter();
  const [nameEn, setNameEn] = useState(initialChart?.name.en ?? "");
  const [nameAr, setNameAr] = useState(initialChart?.name.ar ?? "");
  const [unit, setUnit] = useState<SizeChartUnit>(initialChart?.unit ?? "cm");
  const [isActive, setIsActive] = useState(initialChart?.isActive ?? true);
  const [editorRows, setEditorRows] = useState<EditorRow[]>(() => rowsFromChart(initialChart));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewChart = useMemo(
    () => ({
      unit,
      rows: buildRowsPayload(editorRows),
    }),
    [editorRows, unit],
  );

  const addRow = () => {
    setEditorRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        labelEn: "",
        labelAr: "",
        values: {},
      },
    ]);
  };

  const removeRow = (id: string) => {
    setEditorRows((prev) => {
      if (prev.length === 1) {
        toast.error("At least one measurement row is required.");
        return prev;
      }
      return prev.filter((row) => row.id !== id);
    });
  };

  const updateRowLabel = (id: string, field: "labelEn" | "labelAr", value: string) => {
    setEditorRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const updateRowValue = (id: string, size: SizeChartSize, value: string) => {
    setEditorRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              values: {
                ...row.values,
                [size]: value,
              },
            }
          : row,
      ),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!nameEn.trim()) {
      toast.error("Name (EN) is required.");
      return;
    }

    const rows = buildRowsPayload(editorRows);
    const payload = {
      name: { en: nameEn.trim(), ar: nameAr.trim() || undefined },
      unit,
      isActive,
      rows,
    };

    setIsSubmitting(true);
    try {
      if (mode === "create") {
        await createSizeChart(payload);
        toast.success("Size chart created.");
      } else if (chartId) {
        await updateSizeChart(chartId, payload);
        toast.success("Size chart updated.");
      }
      router.push("/size-charts");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save size chart."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/size-charts"
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">
          {mode === "create" ? "Create size chart" : "Edit size chart"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Basic info
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Name (EN) *</label>
              <input
                value={nameEn}
                onChange={(event) => setNameEn(event.target.value)}
                className={inputClass}
                placeholder="T-Shirt Standard"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Name (AR)</label>
              <input
                value={nameAr}
                onChange={(event) => setNameAr(event.target.value)}
                className={inputClass}
                placeholder="مقاسات التيشيرت"
                dir="rtl"
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Unit</label>
              <select
                value={unit}
                onChange={(event) => setUnit(event.target.value as SizeChartUnit)}
                className={inputClass}
              >
                <option value="cm">cm</option>
                <option value="inch">inch</option>
              </select>
            </div>
            <div className="flex items-end justify-between rounded-lg border border-gray-200 px-3 py-2">
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
          </div>
          {mode === "edit" && initialChart?.slug && (
            <p className="text-xs text-gray-500">
              Slug: <span className="font-mono text-gray-700">{initialChart.slug}</span>
            </p>
          )}
        </section>

        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Measurements
            </h2>
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700"
            >
              <Plus className="size-4" />
              Add row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-2 py-2 text-left">Label (EN)</th>
                  <th className="px-2 py-2 text-left">Label (AR)</th>
                  {PRODUCT_SIZES.map((size) => (
                    <th key={size} className="px-2 py-2 text-center">
                      {size}
                    </th>
                  ))}
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {editorRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-2 py-2">
                      <input
                        value={row.labelEn}
                        onChange={(event) =>
                          updateRowLabel(row.id, "labelEn", event.target.value)
                        }
                        className={inputClass}
                        placeholder="Chest"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        value={row.labelAr}
                        onChange={(event) =>
                          updateRowLabel(row.id, "labelAr", event.target.value)
                        }
                        className={inputClass}
                        placeholder="الصدر"
                        dir="rtl"
                      />
                    </td>
                    {PRODUCT_SIZES.map((size) => (
                      <td key={size} className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={row.values[size] ?? ""}
                          onChange={(event) =>
                            updateRowValue(row.id, size, event.target.value)
                          }
                          className={`${inputClass} text-center`}
                          placeholder="—"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="rounded p-1 text-red-600 hover:bg-red-50"
                        aria-label="Remove row"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">
            Leave size cells empty for sizes this chart does not use.
          </p>
        </section>

        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Preview
          </h2>
          <SizeChartPreview chart={previewChart} />
        </section>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSubmitting
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
              ? "Create size chart"
              : "Save changes"}
        </button>
      </form>
    </div>
  );
}
