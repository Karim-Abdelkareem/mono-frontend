"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import {
  AUTH_STATUS_QUERY_KEY,
  checkAuthSession,
  invalidateAuthQueries,
} from "../lib/auth-session";
import {
  PROACTIVE_REFRESH_INTERVAL_MS,
  refreshAccessToken,
  setOnSessionExpired,
} from "../lib/api";

type AuthGuardProps = {
  children: ReactNode;
};

const PUBLIC_ROUTES = new Set(["/users/login"]);

export default function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  const { data: isAuthenticated, isLoading } = useQuery({
    queryKey: AUTH_STATUS_QUERY_KEY,
    queryFn: checkAuthSession,
    enabled: !isPublicRoute,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    setOnSessionExpired(() => {
      invalidateAuthQueries(queryClient);
      queryClient.setQueryData(AUTH_STATUS_QUERY_KEY, false);
      if (!PUBLIC_ROUTES.has(pathname)) {
        router.replace("/users/login");
      }
    });
    return () => setOnSessionExpired(null);
  }, [pathname, queryClient, router]);

  useEffect(() => {
    if (!isPublicRoute && !isLoading && isAuthenticated === false) {
      router.replace("/users/login");
    }
  }, [isAuthenticated, isLoading, isPublicRoute, router]);

  // Keep access token fresh during long dashboard sessions (server TTL: 15 min).
  useEffect(() => {
    if (isPublicRoute || !isAuthenticated) return;

    const refreshSession = () => {
      void refreshAccessToken();
    };

    const intervalId = window.setInterval(
      refreshSession,
      PROACTIVE_REFRESH_INTERVAL_MS,
    );

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refreshSession();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isAuthenticated, isPublicRoute]);

  if (!isPublicRoute && isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Checking authentication...</p>
      </div>
    );
  }

  if (!isPublicRoute && isAuthenticated === false) {
    return null;
  }

  return <>{children}</>;
}
