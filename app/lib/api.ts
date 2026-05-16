import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  /** Skip refresh-token retry (e.g. refresh endpoint itself). */
  skipAuthRefresh?: boolean;
};

const baseURL = process.env.NEXT_PUBLIC_API_URL;

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;

/**
 * Uses `refreshToken` cookie; backend sets a new `token` access cookie on success.
 * POST /api/v1/users/refresh-token
 */
export async function refreshAccessToken(): Promise<void> {
  if (!baseURL) {
    throw new Error("NEXT_PUBLIC_API_URL is not set.");
  }

  await api.post(
    "/users/refresh-token",
    {},
    {
      baseURL,
      withCredentials: true,
      skipAuthRefresh: true,
    },
  );
}

function isAuthEndpoint(url: string) {
  return url.includes("/users/login") || url.includes("/users/refresh-token");
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

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      await refreshPromise;
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);
