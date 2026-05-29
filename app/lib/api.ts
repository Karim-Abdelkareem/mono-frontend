import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  /** Skip refresh-token retry (e.g. refresh endpoint itself). */
  skipAuthRefresh?: boolean;
};

const baseURL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export const api = axios.create({
  baseURL: baseURL || undefined,
  withCredentials: true,
});

let refreshPromise: Promise<boolean> | null = null;
let onSessionExpired: (() => void) | null = null;

/**
 * Register a handler invoked when refresh-token fails (session truly expired).
 * Used by AuthGuard to clear cache and redirect to login.
 */
export function setOnSessionExpired(handler: (() => void) | null) {
  onSessionExpired = handler;
}

function notifySessionExpired() {
  onSessionExpired?.();
}

const NO_REFRESH_PATHS = [
  "/users/refresh-token",
  "/users/login",
  "/users/register",
  "/users/logout",
] as const;

/** Access token lifetime on the server (15 minutes). */
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

/** Refresh slightly before expiry while the dashboard tab is open. */
export const PROACTIVE_REFRESH_INTERVAL_MS = 14 * 60 * 1000;

function getRequestPath(url: string) {
  try {
    return new URL(url, baseURL ?? "http://localhost").pathname;
  } catch {
    return url;
  }
}

function isAuthEndpoint(url: string) {
  const path = getRequestPath(url);
  return NO_REFRESH_PATHS.some((segment) => path.includes(segment));
}

/**
 * POST /refresh-token — sends `refreshToken` cookie; on success the server
 * rotates session cookies (`token` + `refreshToken`). Access token TTL is 15 min.
 */
export async function refreshAccessToken(): Promise<boolean> {
  if (!baseURL) {
    return false;
  }

  try {
    await api.post(
      "/users/refresh-token",
      {},
      {
        baseURL,
        withCredentials: true,
        skipAuthRefresh: true,
      },
    );
    return true;
  } catch {
    return false;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? "";

    if (
      !originalRequest ||
      status !== 401 ||
      originalRequest._retry ||
      originalRequest.skipAuthRefresh ||
      isAuthEndpoint(requestUrl)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;
    if (refreshed) {
      return api(originalRequest);
    }

    notifySessionExpired();
    return Promise.reject(error);
  },
);
