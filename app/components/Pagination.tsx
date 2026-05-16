"use client";

import { FormEvent, useEffect, useState } from "react";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Optional — shows "Showing X–Y of Z" */
  total?: number;
  limit?: number;
  className?: string;
};

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
  limit,
  className = "",
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const currentPage = Math.min(Math.max(1, page), safeTotalPages);
  const [gotoValue, setGotoValue] = useState(String(currentPage));

  useEffect(() => {
    setGotoValue(String(currentPage));
  }, [currentPage]);

  const goToPage = (raw: string) => {
    const parsed = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(parsed)) {
      setGotoValue(String(currentPage));
      return;
    }
    const next = Math.min(safeTotalPages, Math.max(1, parsed));
    onPageChange(next);
    setGotoValue(String(next));
  };

  const handleGotoSubmit = (event: FormEvent) => {
    event.preventDefault();
    goToPage(gotoValue);
  };

  const showRange =
    typeof total === "number" && typeof limit === "number" && total > 0;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm ${className}`}
    >
      {showRange ? (
        <p className="text-gray-600">
          Showing {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, total)} of{" "}
          {total}
        </p>
      ) : (
        <p className="text-gray-600">
          Page {currentPage} of {safeTotalPages}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>

        <span className="min-w-[5rem] text-center text-gray-600">
          {currentPage} / {safeTotalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(safeTotalPages, currentPage + 1))}
          disabled={currentPage >= safeTotalPages}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>

        <form
          onSubmit={handleGotoSubmit}
          className="ml-1 flex items-center gap-1.5 border-l border-gray-200 pl-3"
        >
          <label htmlFor="pagination-goto" className="sr-only">
            Go to page
          </label>
          <span className="text-gray-500">Go to</span>
          <input
            id="pagination-goto"
            type="number"
            min={1}
            max={safeTotalPages}
            value={gotoValue}
            onChange={(e) => setGotoValue(e.target.value)}
            onBlur={() => goToPage(gotoValue)}
            className="w-14 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-gray-900 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black"
          >
            Go
          </button>
        </form>
      </div>
    </div>
  );
}
