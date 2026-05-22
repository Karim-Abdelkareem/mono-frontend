"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { api, setOnSessionExpired } from "../lib/api";

type AuthGuardProps = {
  children: ReactNode;
};

const PUBLIC_ROUTES = new Set(["/users/login"]);

const AUTH_CHECK_TIMEOUT_MS = 10_000;

async function checkAuth(): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) return false;

  try {
    await api.get("/users/me", {
      baseURL: baseUrl,
      timeout: AUTH_CHECK_TIMEOUT_MS,
    });
    return true;
  } catch {
    return false;
  }
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  const { data: isAuthenticated, isLoading } = useQuery({
    queryKey: ["auth-status"],
    queryFn: checkAuth,
    enabled: !isPublicRoute,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    setOnSessionExpired(() => {
      queryClient.setQueryData(["auth-status"], false);
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
