"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Mail, Shield } from "lucide-react";
import { toast } from "sonner";
import TablePagination from "@/app/components/Pagination";
import ComposeEmailModal, {
  type EmailRecipient,
} from "@/app/users/components/ComposeEmailModal";
import {
  DashboardUser,
  getApiErrorMessage,
  getUserDisplayName,
  getUserPhone,
  getUsers,
  roleBadgeClass,
} from "@/app/lib/userService";

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function UsersTableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={`user-skeleton-${index}`} className="animate-pulse">
          {Array.from({ length: 7 }).map((__, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <div className="h-4 rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page") ?? 1)));
  const [limit, setLimit] = useState(Math.max(1, Number(searchParams.get("limit") ?? 10)));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSendMode, setEmailSendMode] = useState<"selected" | "all">("selected");

  const updateUrl = useCallback(
    (next: { search: string; page: number; limit: number }) => {
      const params = new URLSearchParams();
      if (next.search.trim()) params.set("search", next.search.trim());
      if (next.page > 1) params.set("page", String(next.page));
      if (next.limit !== 10) params.set("limit", String(next.limit));
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router],
  );

  useEffect(() => {
    updateUrl({ search, page, limit });
  }, [limit, page, search, updateUrl]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["users", page, limit],
    queryFn: () => getUsers({ page, limit }),
  });

  const users = useMemo(() => {
    const list = data?.users ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return list;
    return list.filter((user) => {
      const name = getUserDisplayName(user).toLowerCase();
      const email = user.email.toLowerCase();
      const role = (user.role ?? "").toLowerCase();
      return name.includes(query) || email.includes(query) || role.includes(query);
    });
  }, [data?.users, search]);

  const pagination = data?.pagination;
  const totalPages = Math.max(1, pagination?.pages ?? 1);
  const total = pagination?.total ?? 0;
  const errorMessage = error ? getApiErrorMessage(error, "Failed to fetch users.") : "";

  const selectableUsers = useMemo(
    () => users.filter((user) => user.email?.trim()),
    [users],
  );

  const allPageSelected =
    selectableUsers.length > 0 &&
    selectableUsers.every((user) => selectedIds.has(user._id));

  const emailRecipients: EmailRecipient[] = useMemo(() => {
    const source = (data?.users ?? []).filter((user) => selectedIds.has(user._id));
    return source.map((user) => toEmailRecipient(user));
  }, [data?.users, selectedIds]);

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        selectableUsers.forEach((user) => next.delete(user._id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        selectableUsers.forEach((user) => next.add(user._id));
        return next;
      });
    }
  };

  const openBulkEmail = () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one user.");
      return;
    }
    setEmailSendMode("selected");
    setEmailModalOpen(true);
  };

  const openEmailAllUsers = () => {
    if (total === 0) {
      toast.error("No users in the directory.");
      return;
    }
    const confirmed = window.confirm(
      `Send this email to all users with a valid email address in the database?\n\nDirectory total: ${total} users.\nActive-only is enabled by default in the compose screen.`,
    );
    if (!confirmed) return;
    setEmailSendMode("all");
    setEmailModalOpen(true);
  };

  return (
    <div className="mx-auto w-full px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">
            Registered accounts (password and tokens are never exposed).
          </p>
        </div>
        <button
          type="button"
          onClick={openEmailAllUsers}
          disabled={isLoading || total === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-900 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Mail className="size-4" />
          Email all users
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Filter current page by name, email, or role..."
          className="min-w-[220px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900 md:max-w-md"
        />
        <div className="flex flex-wrap items-center gap-3">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={openBulkEmail}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
            >
              <Mail className="size-4" />
              Email selected ({selectedIds.size})
            </button>
          )}
          <p className="text-sm text-gray-600">
            {isLoading ? "Loading..." : `${total} user${total === 1 ? "" : "s"} total`}
          </p>
          <select
            value={String(limit)}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
          >
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleAllOnPage}
                  disabled={!selectableUsers.length}
                  className="size-4 rounded border-gray-300"
                  aria-label="Select all on page"
                />
              </th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <UsersTableSkeleton />
            ) : errorMessage ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-red-600">
                  {errorMessage}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="text-sm text-gray-700">No users found.</p>
                  {search.trim() ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Search only filters the current page. Clear search or try another page.
                    </p>
                  ) : null}
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const displayName = getUserDisplayName(user);
                const statusLabel =
                  user.isActive === false ? "Inactive" : user.isActive === true ? "Active" : "—";
                return (
                  <tr key={user._id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(user._id)}
                        onChange={() => toggleUser(user._id)}
                        disabled={!user.email?.trim()}
                        className="size-4 rounded border-gray-300"
                        aria-label={`Select ${displayName}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/users/${user._id}`}
                        className="flex items-center gap-3 rounded-lg outline-none ring-gray-900/20 focus-visible:ring-2"
                      >
                        <div className="flex size-9 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                          {displayName
                            .split(/\s+/)
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900 hover:underline">
                            {displayName}
                          </p>
                          <p className="truncate text-xs text-gray-500">{user.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-gray-700">
                        <Mail className="size-3.5 shrink-0 text-gray-400" />
                        {user.email || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{getUserPhone(user)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${roleBadgeClass(user.role)}`}
                      >
                        <Shield className="size-3" />
                        {user.role ?? "user"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      {statusLabel === "—" ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            user.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {statusLabel}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && !errorMessage && total > 0 ? (
        <TablePagination
          className="mt-4"
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      ) : null}

      <ComposeEmailModal
        open={emailModalOpen}
        recipients={emailRecipients}
        sendMode={emailSendMode}
        allUsersCount={total}
        onClose={() => {
          setEmailModalOpen(false);
          setEmailSendMode("selected");
        }}
        onSent={() => setSelectedIds(new Set())}
      />
    </div>
  );
}

function toEmailRecipient(user: DashboardUser): EmailRecipient {
  return {
    _id: user._id,
    email: user.email,
    name: getUserDisplayName(user),
  };
}
