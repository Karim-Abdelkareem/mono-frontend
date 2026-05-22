"use client";

import type { QueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { ApiEnvelope, AuthUser } from "./types/auth";

export const AUTH_STATUS_QUERY_KEY = ["auth-status"] as const;
export const CURRENT_USER_QUERY_KEY = ["current-user-profile"] as const;

/**
 * Session probe — GET /users/me (401 triggers refresh + retry via api interceptor).
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data } = await api.get<ApiEnvelope<AuthUser>>("/users/me");
    return data.data ?? null;
  } catch {
    return null;
  }
}

export async function checkAuthSession(): Promise<boolean> {
  const user = await fetchCurrentUser();
  return user !== null;
}

export function setAuthSessionCached(
  queryClient: QueryClient,
  authenticated: boolean,
  user?: AuthUser | null,
) {
  queryClient.setQueryData(AUTH_STATUS_QUERY_KEY, authenticated);
  if (user) {
    queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);
  }
}

export function invalidateAuthQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: AUTH_STATUS_QUERY_KEY });
  queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY });
}
