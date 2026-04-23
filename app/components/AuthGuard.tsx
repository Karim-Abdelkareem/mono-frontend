"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { api } from "../lib/api";

type AuthGuardProps = {
  children: ReactNode;
};

const PUBLIC_ROUTES = new Set(["/users/login"]);

async function checkAuth(): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) return false;

  try {
    await api.get("/users/me", {
      baseURL: baseUrl,
    });
    return true;
  } catch {
    return false;
  }
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  const { data: isAuthenticated, isLoading } = useQuery({
    queryKey: ["auth-status"],
    queryFn: checkAuth,
    enabled: !isPublicRoute,
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!isPublicRoute && !isLoading && isAuthenticated === false) {
      router.replace("/users/login");
    }
  }, [isAuthenticated, isLoading, isPublicRoute, router]);

  if (!isPublicRoute && (isLoading || isAuthenticated === false)) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Checking authentication...</p>
      </div>
    );
  }

  return <>{children}</>;
}
