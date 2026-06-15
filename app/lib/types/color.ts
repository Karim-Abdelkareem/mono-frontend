export type PaletteColor = {
  _id: string;
  name: { en?: string; ar?: string };
  hexCode: string;
  slug: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ColorCreatePayload = {
  name: { en: string; ar?: string };
  hexCode: string;
  isActive?: boolean;
};

export type ColorUpdatePayload = Partial<ColorCreatePayload>;
