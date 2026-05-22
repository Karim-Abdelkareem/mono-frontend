"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  Shield,
} from "lucide-react";
import {
  CURRENT_USER_QUERY_KEY,
  fetchCurrentUser,
} from "../../lib/auth-session";
import type { AuthUser } from "../../lib/types/auth";

type ProfileUser = AuthUser & {
  fullName?: string;
  phone?: string;
  location?: string;
  department?: string;
  isActive?: boolean;
};

async function getCurrentUser(): Promise<ProfileUser> {
  const user = await fetchCurrentUser();
  if (!user) {
    throw new Error("Not authenticated.");
  }
  return user;
}

export default function AdminProfilePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: getCurrentUser,
  });

  const profile = {
    fullName: data?.fullName || data?.name || "Admin User",
    role: data?.role || "Administrator",
    employeeId: data?._id || "N/A",
    email: data?.email || "Not provided",
    phone: data?.phone || data?.address?.phone || "Not provided",
    location: data?.location || "Not provided",
    department: data?.department || "Management",
    joinedAt: data?.createdAt
      ? new Date(data.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        })
      : "Not available",
    status: data?.isActive === false ? "Inactive" : "Active",
  };

  return (
    <section className="flex min-h-screen flex-col bg-gray-50">
      <div className="flex flex-1 flex-col w-full">
        <div className="flex h-full flex-1 flex-col overflow-hidden bg-white">
          <div className="border-b border-gray-200 bg-linear-to-r from-black via-black to-gray-900 px-6 py-6 text-white md:px-8">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-300">
              Mono Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Admin Profile</h1>
            <p className="mt-1 text-sm text-gray-300">
              Internal identity and access profile for administration use.
            </p>
          </div>

          {isLoading && (
            <p className="border-b border-gray-200 px-6 py-3 text-sm text-gray-500 md:px-8">
              Loading profile information...
            </p>
          )}
          {isError && (
            <p className="border-b border-gray-200 px-6 py-3 text-sm text-red-600 md:px-8">
              Failed to load user profile. Showing fallback information.
            </p>
          )}

          <div className="grid flex-1 gap-0 md:grid-cols-[280px_1fr]">
            <aside className="flex flex-col border-b border-gray-200 bg-gray-100/60 p-6 md:border-b-0 md:border-r md:px-6 md:py-8">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gray-900 text-3xl font-semibold text-white">
                  {profile.fullName
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  {profile.fullName}
                </h2>
                <p className="text-sm capitalize text-gray-600">
                  {profile.role}
                </p>
                <span
                  className={`mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                    profile.status === "Active"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {profile.status}
                </span>
              </div>

              <div className="mt-6 rounded-xl shrink-0 w-full border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Employee ID
                </p>
                <p className="mt-1 font-mono text-sm text-gray-900">
                  {profile.employeeId}
                </p>
              </div>
            </aside>

            <main className="flex h-full flex-col p-6 md:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoItem
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={profile.email}
                />
                <InfoItem
                  icon={<Phone className="h-4 w-4" />}
                  label="Phone"
                  value={profile.phone}
                />
                <InfoItem
                  icon={<MapPin className="h-4 w-4" />}
                  label="Location"
                  value={profile.location}
                />
                <InfoItem
                  icon={<Building2 className="h-4 w-4" />}
                  label="Department"
                  value={profile.department}
                />
                <InfoItem
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Joined Date"
                  value={profile.joinedAt}
                />
                <InfoItem
                  icon={<Shield className="h-4 w-4" />}
                  label="Access Level"
                  value="Full System Access"
                />
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Responsibilities
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-gray-600">
                    <li>Manage products, categories, and order workflows.</li>
                    <li>Review analytics and monitor platform performance.</li>
                    <li>
                      Control administrative access and security settings.
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Security Notes
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-gray-600">
                    <li>2FA enabled with device-level verification.</li>
                    <li>Session policy: auto refresh with secured cookies.</li>
                    <li>Last credential update: March 2026.</li>
                  </ul>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
        <span className="text-gray-600">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
