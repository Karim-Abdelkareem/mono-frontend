"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Copy,
  Loader2,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Shield,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  DashboardUser,
  editFormToUpdatePayload,
  formatUserAddress,
  getApiErrorMessage,
  getProfileBio,
  getUserDisplayName,
  getUserHandle,
  getUserInitials,
  getUserPhone,
  roleBadgeClass,
  updateUserById,
  userToEditForm,
  type UserEditFormValues,
} from "@/app/lib/userService";
import ComposeEmailModal from "./ComposeEmailModal";

type ProfileTab = "about" | "details";

type UserProfileViewProps = {
  user: DashboardUser;
  isOwnProfile?: boolean;
  onUserUpdated?: (user: DashboardUser) => void;
};

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10";

function formatJoined(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatRelativeJoined(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const now = new Date();
  const years = now.getFullYear() - date.getFullYear();
  if (years >= 1) return `${years}y on Mono`;
  const months = Math.max(
    1,
    (now.getFullYear() - date.getFullYear()) * 12 +
      (now.getMonth() - date.getMonth()),
  );
  return `${months}mo on Mono`;
}

export default function UserProfileView({
  user: initialUser,
  isOwnProfile = false,
  onUserUpdated,
}: UserProfileViewProps) {
  const [profileUser, setProfileUser] = useState(initialUser);
  const [tab, setTab] = useState<ProfileTab>("about");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<UserEditFormValues>(() => userToEditForm(initialUser));
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const displayName = getUserDisplayName(profileUser);
  const handle = getUserHandle(isEditing ? { ...profileUser, email: form.email, name: form.name } : profileUser);
  const phone = isEditing ? form.address.phone || "—" : getUserPhone(profileUser);
  const bio = getProfileBio(profileUser);
  const statusLabel = form.isActive ? "Active" : "Inactive";

  const startEditing = () => {
    setForm(userToEditForm(profileUser));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setForm(userToEditForm(profileUser));
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Email is required.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateUserById(profileUser._id, editFormToUpdatePayload(form));
      setProfileUser(updated);
      setForm(userToEditForm(updated));
      setIsEditing(false);
      onUserUpdated?.(updated);
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update user."));
    } finally {
      setIsSaving(false);
    }
  };

  const copyUserId = async () => {
    try {
      await navigator.clipboard.writeText(profileUser._id);
      toast.success("User ID copied.");
    } catch {
      toast.error("Could not copy ID.");
    }
  };

  const updateAddress = (field: keyof UserEditFormValues["address"], value: string) => {
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  };

  const stats = [
    {
      label: "Member since",
      value: formatJoined(profileUser.createdAt),
      hint: formatRelativeJoined(profileUser.createdAt),
      editable: false,
    },
    {
      label: "Account",
      value: statusLabel,
      hint: profileUser.role === "admin" ? "Admin access" : "Customer",
      editable: true,
    },
    {
      label: "Shipping",
      value: profileUser.isProfileShippingComplete ? "Complete" : "Incomplete",
      hint: profileUser.isProfileShippingComplete
        ? "Ready to checkout"
        : "Needs address",
      editable: false,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl pb-10">
      {!isOwnProfile && (
        <Link
          href="/users"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="size-4" />
          Back to users
        </Link>
      )}

      <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="relative h-40 bg-linear-to-br from-gray-900 via-gray-800 to-gray-600 sm:h-48">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="absolute right-4 top-4 flex flex-wrap items-center justify-end gap-2">
            {isOwnProfile && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                Your profile
              </span>
            )}
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/20 disabled:opacity-50"
                >
                  <X className="size-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-100 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : null}
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
              </>
            ) : (
              <>
                {!isOwnProfile && profileUser.email?.trim() && (
                  <button
                    type="button"
                    onClick={() => setEmailModalOpen(true)}
                    className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/20"
                  >
                    <Mail className="size-3.5" />
                    Send email
                  </button>
                )}
                <button
                  type="button"
                  onClick={startEditing}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-100"
                >
                  <Pencil className="size-3.5" />
                  Edit profile
                </button>
              </>
            )}
          </div>
        </div>

        <div className="relative px-4 pb-2 sm:px-6">
          <div className="-mt-14 flex flex-wrap items-end justify-between gap-4 sm:-mt-16">
            <div className="flex size-28 items-center justify-center rounded-full border-4 border-white bg-gray-900 text-3xl font-semibold text-white shadow-lg sm:size-32">
              {getUserInitials(
                isEditing ? { name: form.name, email: form.email, fullName: form.name } : profileUser,
              )}
            </div>
            {profileUser.role === "admin" && !isEditing && (
              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-medium text-violet-800">
                <Shield className="size-3.5" />
                Admin
              </span>
            )}
          </div>

          <div className="mt-3 space-y-3">
            {isEditing ? (
              <div className="max-w-xl space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className={inputClass}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className={inputClass}
                    placeholder="email@example.com"
                    required
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
                  {profileUser.isActive !== false && (
                    <BadgeCheck
                      className="size-5 text-sky-500"
                      aria-label="Verified account"
                    />
                  )}
                </div>
                <p className="text-sm text-gray-500">{handle}</p>
                <p className="max-w-xl text-sm leading-relaxed text-gray-700">{bio}</p>
              </>
            )}

            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${roleBadgeClass(profileUser.role)}`}
              >
                {profileUser.role ?? "user"}
              </span>
              {isEditing ? (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                    }
                    className="size-3.5 rounded border-gray-300"
                  />
                  Active account
                </label>
              ) : (
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                    profileUser.isActive === false
                      ? "bg-gray-100 text-gray-600"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {profileUser.isActive === false ? "Inactive" : "Active"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x divide-gray-200 border-y border-gray-200">
          {stats.map((stat) => (
            <div key={stat.label} className="px-3 py-4 text-center sm:px-4">
              {isEditing && stat.editable ? (
                <select
                  value={form.isActive ? "active" : "inactive"}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      isActive: event.target.value === "active",
                    }))
                  }
                  className="mx-auto rounded-lg border border-gray-200 px-2 py-1 text-sm font-semibold text-gray-900"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              ) : (
                <p className="text-sm font-semibold text-gray-900">{stat.value}</p>
              )}
              <p className="mt-0.5 text-xs text-gray-500">{stat.label}</p>
              <p className="mt-1 hidden text-[10px] text-gray-400 sm:block">{stat.hint}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 border-b border-gray-200 px-4 sm:px-6">
          {(
            [
              { id: "about" as const, label: "About" },
              { id: "details" as const, label: "Details" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                tab === item.id
                  ? "text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {item.label}
              {tab === item.id && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-gray-900" />
              )}
            </button>
          ))}
        </div>

        <div className="px-4 py-6 sm:px-6">
          {tab === "about" ? (
            <div className="space-y-4">
              {!isEditing && (
                <section className="rounded-xl bg-gray-50 p-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    About
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-700">{bio}</p>
                </section>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <FieldCard
                  icon={<Mail className="size-4" />}
                  label="Email"
                  isEditing={isEditing}
                  readValue={profileUser.email || "—"}
                  input={
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, email: event.target.value }))
                      }
                      className={inputClass}
                    />
                  }
                />
                <FieldCard
                  icon={<Phone className="size-4" />}
                  label="Phone"
                  isEditing={isEditing}
                  readValue={getUserPhone(profileUser)}
                  input={
                    <input
                      value={form.address.phone}
                      onChange={(event) => updateAddress("phone", event.target.value)}
                      className={inputClass}
                      placeholder="Phone number"
                    />
                  }
                />
                <FieldCard
                  icon={<MapPin className="size-4" />}
                  label="Location"
                  isEditing={isEditing}
                  readValue={profileUser.location || formatUserAddress(profileUser) || "Not set"}
                  input={
                    <div className="space-y-2">
                      <input
                        value={form.address.street}
                        onChange={(event) => updateAddress("street", event.target.value)}
                        className={inputClass}
                        placeholder="Street"
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          value={form.address.area}
                          onChange={(event) => updateAddress("area", event.target.value)}
                          className={inputClass}
                          placeholder="Area"
                        />
                        <input
                          value={form.address.governorate}
                          onChange={(event) =>
                            updateAddress("governorate", event.target.value)
                          }
                          className={inputClass}
                          placeholder="Governorate"
                        />
                      </div>
                    </div>
                  }
                />
                <FieldCard
                  icon={<Calendar className="size-4" />}
                  label="Joined"
                  isEditing={false}
                  readValue={formatJoined(profileUser.createdAt)}
                />
              </div>

              {profileUser.role === "admin" && !isEditing && (
                <section className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-violet-900">
                    <Package className="size-4" />
                    Dashboard access
                  </div>
                  <p className="mt-2 text-sm text-violet-800/90">
                    Manages products, orders, coupons, shipping, and size charts for the Mono
                    store.
                  </p>
                </section>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <DetailRow
                label="Full name"
                isEditing={isEditing}
                readValue={displayName}
                input={
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className={inputClass}
                  />
                }
              />
              <DetailRow
                label="Email"
                isEditing={isEditing}
                readValue={profileUser.email || "—"}
                input={
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className={inputClass}
                  />
                }
              />
              <DetailRow
                label="Phone"
                isEditing={isEditing}
                readValue={phone}
                input={
                  <input
                    value={form.address.phone}
                    onChange={(event) => updateAddress("phone", event.target.value)}
                    className={inputClass}
                  />
                }
              />
              <DetailRow label="Role" isEditing={false} readValue={profileUser.role ?? "user"} />
              <DetailRow
                label="Department"
                isEditing={false}
                readValue={profileUser.department || "—"}
              />
              <DetailRow
                label="Street"
                isEditing={isEditing}
                readValue={profileUser.address?.street || "—"}
                input={
                  <input
                    value={form.address.street}
                    onChange={(event) => updateAddress("street", event.target.value)}
                    className={inputClass}
                  />
                }
              />
              <DetailRow
                label="Area"
                isEditing={isEditing}
                readValue={profileUser.address?.area || "—"}
                input={
                  <input
                    value={form.address.area}
                    onChange={(event) => updateAddress("area", event.target.value)}
                    className={inputClass}
                  />
                }
              />
              <DetailRow
                label="Governorate"
                isEditing={isEditing}
                readValue={profileUser.address?.governorate || "—"}
                input={
                  <input
                    value={form.address.governorate}
                    onChange={(event) => updateAddress("governorate", event.target.value)}
                    className={inputClass}
                  />
                }
              />
              <DetailRow
                label="Shipping profile"
                isEditing={false}
                readValue={
                  profileUser.isProfileShippingComplete ? "Complete" : "Incomplete"
                }
              />
              <DetailRow
                label="Account status"
                isEditing={isEditing}
                readValue={profileUser.isActive === false ? "Inactive" : "Active"}
                input={
                  <select
                    value={form.isActive ? "active" : "inactive"}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        isActive: event.target.value === "active",
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                }
              />
              <DetailRow
                label="Last updated"
                isEditing={false}
                readValue={formatJoined(profileUser.updatedAt)}
              />
              <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">User ID</p>
                  <p className="mt-1 font-mono text-xs text-gray-800">{profileUser._id}</p>
                </div>
                <button
                  type="button"
                  onClick={copyUserId}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <Copy className="size-3.5" />
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      </article>

      {!isOwnProfile && profileUser.email?.trim() && (
        <ComposeEmailModal
          open={emailModalOpen}
          recipients={[
            {
              _id: profileUser._id,
              email: profileUser.email,
              name: getUserDisplayName(profileUser),
            },
          ]}
          onClose={() => setEmailModalOpen(false)}
        />
      )}
    </div>
  );
}

function FieldCard({
  icon,
  label,
  isEditing,
  readValue,
  input,
}: {
  icon: React.ReactNode;
  label: string;
  isEditing: boolean;
  readValue: string;
  input?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
        <span className="text-gray-400">{icon}</span>
        {label}
      </div>
      {isEditing && input ? (
        <div className="mt-2">{input}</div>
      ) : (
        <p className="mt-2 text-sm font-medium text-gray-900">{readValue}</p>
      )}
    </div>
  );
}

function DetailRow({
  label,
  isEditing,
  readValue,
  input,
}: {
  label: string;
  isEditing: boolean;
  readValue: string;
  input?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      {isEditing && input ? (
        <div className="w-full sm:max-w-md">{input}</div>
      ) : (
        <span className="text-sm font-medium text-gray-900 sm:text-right">{readValue}</span>
      )}
    </div>
  );
}
