export type ApiEnvelope<T> = {
  status: string;
  message?: string;
  reason?: string;
  data?: T;
};

export type UserAddress = {
  governorate?: string;
  area?: string;
  street?: string;
  phone?: string;
};

export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  role?: "user" | "admin";
  address?: UserAddress | null;
  isProfileShippingComplete?: boolean;
  createdAt?: string;
  updatedAt?: string;
};
