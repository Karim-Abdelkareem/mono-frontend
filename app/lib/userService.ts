"use client";

import axios from "axios";
import { fetchCurrentUser } from "./auth-session";
import { api } from "./api";
import type { AuthUser, UserAddress } from "./types/auth";

export type DashboardUser = AuthUser & {
  fullName?: string;
  phone?: string;
  location?: string;
  department?: string;
  isActive?: boolean;
};

export type UsersPagination = {
  page: number;
  pages: number;
  total: number;
};

export type GetUsersParams = {
  page?: number;
  limit?: number;
};

export type GetUsersResult = {
  users: DashboardUser[];
  results: number;
  pagination: UsersPagination;
};

export type UpdateUserPayload = {
  name?: string;
  email?: string;
  address?: UserAddress;
  isActive?: boolean;
};

export type UserEditFormValues = {
  name: string;
  email: string;
  isActive: boolean;
  address: {
    governorate: string;
    area: string;
    street: string;
    phone: string;
  };
};

type UsersListResponse = {
  status?: string;
  results?: number;
  pagination?: Partial<UsersPagination>;
  data?: { users?: unknown[] };
  users?: unknown[];
  message?: string;
};

type UserResponse = {
  status?: string;
  data?: { user?: unknown } | unknown;
  user?: unknown;
  message?: string;
};

function getBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not set.");
  }
  return baseUrl;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizeAddress(raw: unknown): UserAddress | null | undefined {
  const source = asRecord(raw);
  if (!source) return undefined;
  return {
    governorate: typeof source.governorate === "string" ? source.governorate : undefined,
    area: typeof source.area === "string" ? source.area : undefined,
    street: typeof source.street === "string" ? source.street : undefined,
    phone: typeof source.phone === "string" ? source.phone : undefined,
  };
}

export function normalizeDashboardUser(raw: unknown): DashboardUser | null {
  const source = asRecord(raw);
  if (!source || typeof source._id !== "string") return null;

  const role = source.role === "admin" ? "admin" : source.role === "user" ? "user" : undefined;

  return {
    _id: source._id,
    name: typeof source.name === "string" ? source.name : "",
    email: typeof source.email === "string" ? source.email : "",
    role,
    fullName: typeof source.fullName === "string" ? source.fullName : undefined,
    phone: typeof source.phone === "string" ? source.phone : undefined,
    location: typeof source.location === "string" ? source.location : undefined,
    department: typeof source.department === "string" ? source.department : undefined,
    address: normalizeAddress(source.address),
    isProfileShippingComplete:
      typeof source.isProfileShippingComplete === "boolean"
        ? source.isProfileShippingComplete
        : undefined,
    isActive: typeof source.isActive === "boolean" ? source.isActive : undefined,
    createdAt: typeof source.createdAt === "string" ? source.createdAt : undefined,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    return message || fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export function getUserDisplayName(user: Pick<DashboardUser, "name" | "fullName" | "email">) {
  return user.fullName?.trim() || user.name?.trim() || user.email || "Unknown user";
}

export function getUserPhone(user: DashboardUser) {
  return user.phone?.trim() || user.address?.phone?.trim() || "—";
}

export function getUserHandle(user: Pick<DashboardUser, "email" | "name">) {
  const fromEmail = user.email?.split("@")[0]?.trim();
  if (fromEmail) return `@${fromEmail.toLowerCase()}`;
  const slug = user.name?.trim().toLowerCase().replace(/\s+/g, "");
  return slug ? `@${slug}` : "@user";
}

export function getUserInitials(user: Pick<DashboardUser, "name" | "fullName" | "email">) {
  const name = getUserDisplayName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || user.email?.slice(0, 2) || "U").toUpperCase();
}

export function formatUserAddress(user: DashboardUser) {
  const parts = [
    user.address?.street,
    user.address?.area,
    user.address?.governorate,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export function userToEditForm(user: DashboardUser): UserEditFormValues {
  return {
    name: user.name?.trim() || user.fullName?.trim() || "",
    email: user.email?.trim() || "",
    isActive: user.isActive !== false,
    address: {
      governorate: user.address?.governorate?.trim() || "",
      area: user.address?.area?.trim() || "",
      street: user.address?.street?.trim() || "",
      phone: user.address?.phone?.trim() || user.phone?.trim() || "",
    },
  };
}

export function editFormToUpdatePayload(values: UserEditFormValues): UpdateUserPayload {
  const address: UserAddress = {
    governorate: values.address.governorate.trim() || undefined,
    area: values.address.area.trim() || undefined,
    street: values.address.street.trim() || undefined,
    phone: values.address.phone.trim() || undefined,
  };

  return {
    name: values.name.trim(),
    email: values.email.trim(),
    isActive: values.isActive,
    address,
  };
}

export function getProfileBio(user: DashboardUser) {
  if (user.role === "admin") {
    return "Mono dashboard administrator · full platform access.";
  }
  if (user.isProfileShippingComplete) {
    return "Store customer · shipping profile complete.";
  }
  return "Store customer · exploring Mono collections.";
}

export function roleBadgeClass(role?: DashboardUser["role"]) {
  if (role === "admin") return "bg-violet-100 text-violet-700";
  return "bg-gray-100 text-gray-700";
}

export async function getUserById(id: string): Promise<DashboardUser | null> {
  const baseURL = getBaseUrl();
  const { data } = await api.get<UserResponse>(`/users/${id}`, { baseURL });
  return extractUserFromResponse(data);
}

function extractUserFromResponse(data: UserResponse | undefined): DashboardUser | null {
  const raw =
    (data?.data as { user?: unknown } | undefined)?.user ??
    (data?.data && typeof data.data === "object" && !("users" in (data.data as object))
      ? data.data
      : null) ??
    data?.user ??
    null;
  return normalizeDashboardUser(raw);
}

export async function updateUserById(
  id: string,
  payload: UpdateUserPayload,
): Promise<DashboardUser> {
  const baseURL = getBaseUrl();
  const { data } = await api.patch<UserResponse>(`/users/${id}`, payload, { baseURL });
  const updated = extractUserFromResponse(data);
  if (!updated) {
    throw new Error("User updated but response is invalid.");
  }
  return updated;
}

export async function getProfileUser(id: string): Promise<DashboardUser | null> {
  if (id === "me") {
    const user = await fetchCurrentUser();
    return normalizeDashboardUser(user);
  }
  return getUserById(id);
}

export async function getUsers(params: GetUsersParams = {}): Promise<GetUsersResult> {
  const baseURL = getBaseUrl();
  const query = {
    page: params.page ?? 1,
    limit: params.limit ?? 10,
  };

  const { data } = await api.get<UsersListResponse>("/users", { baseURL, params: query });
  const rawUsers =
    (data?.data as { users?: unknown[] } | undefined)?.users ?? data?.users ?? [];

  const users = rawUsers
    .map((item) => normalizeDashboardUser(item))
    .filter((item): item is DashboardUser => Boolean(item));

  const pagination = data?.pagination ?? {};
  return {
    users,
    results: Number(data?.results ?? users.length),
    pagination: {
      page: Number(pagination.page ?? query.page),
      pages: Number(pagination.pages ?? 1),
      total: Number(pagination.total ?? users.length),
    },
  };
}
