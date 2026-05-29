"use client";

import axios from "axios";
import { api } from "./api";

export type SendEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendBulkEmailPayload = {
  userIds: string[];
  subject: string;
  html: string;
  text?: string;
};

export type SendBulkEmailAllPayload = {
  subject: string;
  html: string;
  text?: string;
  /** When true (default), only users with isActive: true receive mail. */
  onlyActive?: boolean;
};

export type EmailSendResult = {
  sent: number;
  failed: number;
  total?: number;
  errors?: Array<{ email?: string; userId?: string; message: string }>;
};

type EmailApiResponse = {
  status?: string;
  message?: string;
  data?: EmailSendResult;
};

function getBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not set.");
  }
  return baseUrl;
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    return message || fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Turn plain textarea content into simple HTML paragraphs. */
export function plainTextToHtml(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").filter(Boolean);
      if (lines.length === 1) {
        return `<p style="margin:0 0 16px;">${escapeHtml(lines[0])}</p>`;
      }
      return `<p style="margin:0 0 16px;">${lines.map((line) => escapeHtml(line)).join("<br />")}</p>`;
    })
    .join("");
}

export function applyNamePlaceholder(content: string, name: string) {
  return content.replace(/\{\{\s*name\s*\}\}/gi, name || "there");
}

function normalizeSendResult(raw: unknown): EmailSendResult {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const errorsRaw = Array.isArray(source.errors) ? source.errors : [];
  return {
    sent: Number(source.sent ?? 0),
    failed: Number(source.failed ?? 0),
    total: typeof source.total === "number" ? source.total : undefined,
    errors: errorsRaw.map((entry) => {
      const row = entry as Record<string, unknown>;
      return {
        email: typeof row.email === "string" ? row.email : undefined,
        userId: typeof row.userId === "string" ? row.userId : undefined,
        message: typeof row.message === "string" ? row.message : "Send failed",
      };
    }),
  };
}

export async function sendEmail(payload: SendEmailPayload): Promise<EmailSendResult> {
  const baseURL = getBaseUrl();
  const { data } = await api.post<EmailApiResponse>("/admin/emails/send", payload, {
    baseURL,
  });
  return normalizeSendResult(data?.data ?? { sent: 1, failed: 0 });
}

export async function sendBulkEmail(payload: SendBulkEmailPayload): Promise<EmailSendResult> {
  const baseURL = getBaseUrl();
  const { data } = await api.post<EmailApiResponse>("/admin/emails/bulk", payload, {
    baseURL,
  });
  return normalizeSendResult(data?.data ?? { sent: 0, failed: 0 });
}

export async function sendBulkEmailToAll(
  payload: SendBulkEmailAllPayload,
): Promise<EmailSendResult> {
  const baseURL = getBaseUrl();
  const { data } = await api.post<EmailApiResponse>(
    "/admin/emails/bulk-all",
    {
      ...payload,
      onlyActive: payload.onlyActive !== false,
    },
    { baseURL },
  );
  return normalizeSendResult(data?.data ?? { sent: 0, failed: 0 });
}
