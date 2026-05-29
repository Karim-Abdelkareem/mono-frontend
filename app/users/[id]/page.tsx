"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CURRENT_USER_QUERY_KEY } from "@/app/lib/auth-session";
import {
  DashboardUser,
  getApiErrorMessage,
  getProfileUser,
} from "@/app/lib/userService";
import UserProfileView from "../components/UserProfileView";

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-4 px-4 py-6">
      <div className="h-48 rounded-2xl bg-gray-200" />
      <div className="flex gap-4">
        <div className="size-28 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2 pt-16">
          <div className="h-6 w-48 rounded bg-gray-200" />
          <div className="h-4 w-32 rounded bg-gray-200" />
        </div>
      </div>
      <div className="h-24 rounded-xl bg-gray-200" />
    </div>
  );
}

export default function UserProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const handleUserUpdated = (updated: DashboardUser) => {
    if (id === "me") {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, updated);
    } else {
      queryClient.setQueryData(["user-profile", id], updated);
    }
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const {
    data: user,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: id === "me" ? CURRENT_USER_QUERY_KEY : ["user-profile", id],
    queryFn: () => getProfileUser(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!id) {
      toast.error("Missing user id.");
      router.replace("/users");
    }
  }, [id, router]);

  if (!id) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-8">
        <ProfileSkeleton />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center md:px-8">
        <p className="text-sm text-red-600">
          {getApiErrorMessage(error, "User not found or could not load profile.")}
        </p>
        <button
          type="button"
          onClick={() => router.push("/users")}
          className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          Back to users
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-8">
      <UserProfileView
        key={`${user._id}-${user.updatedAt ?? user.createdAt ?? ""}`}
        user={user}
        isOwnProfile={id === "me"}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
}
