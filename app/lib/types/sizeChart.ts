import { PRODUCT_SIZES } from "@/app/store/productStore";

export type SizeChartSize = (typeof PRODUCT_SIZES)[number];

export type SizeChartUnit = "cm" | "inch";

export type LocalizedLabel = {
  en?: string;
  ar?: string;
};

export type SizeChartRowValue = {
  size: SizeChartSize;
  value: number;
};

export type SizeChartRow = {
  label: LocalizedLabel;
  values: SizeChartRowValue[];
};

export type SizeChart = {
  _id: string;
  name: LocalizedLabel;
  slug: string;
  isActive: boolean;
  unit: SizeChartUnit;
  rows: SizeChartRow[];
  createdAt?: string;
  updatedAt?: string;
};

export type SizeChartCreatePayload = {
  name: { en: string; ar?: string };
  unit?: SizeChartUnit;
  isActive?: boolean;
  rows?: SizeChartRow[];
};

export type SizeChartUpdatePayload = Partial<{
  name: LocalizedLabel;
  unit: SizeChartUnit;
  isActive: boolean;
  rows: SizeChartRow[];
}>;
