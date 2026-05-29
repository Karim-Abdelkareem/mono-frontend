"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, Mail, X } from "lucide-react";
import { toast } from "sonner";
import {
  applyNamePlaceholder,
  getApiErrorMessage,
  plainTextToHtml,
  sendBulkEmail,
  sendBulkEmailToAll,
  sendEmail,
} from "@/app/lib/emailService";
import { wrapEmailHtml } from "@/app/lib/emailTemplate";
import { getUserDisplayName } from "@/app/lib/userService";

export type EmailRecipient = {
  _id: string;
  email: string;
  name?: string;
};

export type EmailSendMode = "selected" | "all";

type ComposeEmailModalProps = {
  open: boolean;
  recipients: EmailRecipient[];
  sendMode?: EmailSendMode;
  /** Total users in DB when sendMode is "all". */
  allUsersCount?: number;
  onClose: () => void;
  onSent?: () => void;
};

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10";

export default function ComposeEmailModal({
  open,
  recipients,
  sendMode = "selected",
  allUsersCount = 0,
  onClose,
  onSent,
}: ComposeEmailModalProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const sendToAll = sendMode === "all";

  const validRecipients = useMemo(
    () => recipients.filter((r) => r.email?.trim()),
    [recipients],
  );

  const previewName = validRecipients[0]
    ? getUserDisplayName({
        name: validRecipients[0].name ?? "",
        email: validRecipients[0].email,
        fullName: validRecipients[0].name,
      })
    : "Customer";

  const previewHtml = useMemo(() => {
    if (!body.trim()) return "";
    const inner = plainTextToHtml(applyNamePlaceholder(body.trim(), previewName));
    return wrapEmailHtml(inner, {
      previewText: applyNamePlaceholder(body.trim(), previewName).slice(0, 120),
    });
  }, [body, previewName]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSending) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, isSending, onClose]);

  useEffect(() => {
    if (!open) {
      setSubject("");
      setBody("");
      setOnlyActive(true);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!subject.trim()) {
      toast.error("Subject is required.");
      return;
    }
    if (!body.trim()) {
      toast.error("Message is required.");
      return;
    }
    if (!sendToAll && !validRecipients.length) {
      toast.error("No valid recipient emails.");
      return;
    }

    const html = plainTextToHtml(applyNamePlaceholder(body.trim(), previewName));
    const text = applyNamePlaceholder(body.trim(), previewName);

    setIsSending(true);
    try {
      let result;
      if (sendToAll) {
        result = await sendBulkEmailToAll({
          subject: subject.trim(),
          html,
          text,
          onlyActive,
        });
      } else if (validRecipients.length === 1) {
        result = await sendEmail({
          to: validRecipients[0].email.trim(),
          subject: subject.trim(),
          html,
          text,
        });
      } else {
        result = await sendBulkEmail({
          userIds: validRecipients.map((r) => r._id),
          subject: subject.trim(),
          html,
          text,
        });
      }

      if (result.failed > 0 && result.sent > 0) {
        toast.warning(`Sent ${result.sent}, failed ${result.failed}.`);
      } else if (result.failed > 0) {
        toast.error(`Failed to send (${result.failed}).`);
      } else {
        const count = sendToAll ? (result.total ?? result.sent) : result.sent;
        toast.success(
          sendToAll
            ? `Email sent to ${result.sent} of ${count} user${count === 1 ? "" : "s"}.`
            : validRecipients.length === 1
              ? "Email sent successfully."
              : `Email sent to ${result.sent} user${result.sent === 1 ? "" : "s"}.`,
        );
      }
      onSent?.();
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to send email."));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-labelledby="compose-email-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Mail className="size-5 text-gray-700" />
            <h2 id="compose-email-title" className="text-lg font-semibold text-gray-900">
              {sendToAll
                ? "Email all users"
                : validRecipients.length === 1
                  ? "Send email"
                  : "Send bulk email"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                {sendToAll ? "Recipients" : `To (${validRecipients.length})`}
              </p>
              {sendToAll ? (
                <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                  <p>
                    This will email{" "}
                    <span className="font-semibold">
                      all {onlyActive ? "active " : ""}users with an email address
                    </span>{" "}
                    ({allUsersCount > 0 ? `~${allUsersCount} in directory` : "full database"}).
                    Sending may take a while for large lists.
                  </p>
                  <label className="flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={onlyActive}
                      onChange={(event) => setOnlyActive(event.target.checked)}
                      className="size-3.5 rounded border-amber-300"
                    />
                    Active users only (recommended)
                  </label>
                </div>
              ) : (
                <div className="max-h-28 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2">
                  <ul className="space-y-1 text-xs text-gray-700">
                    {validRecipients.map((recipient) => (
                      <li key={recipient._id} className="truncate">
                        {getUserDisplayName({
                          name: recipient.name ?? "",
                          email: recipient.email,
                          fullName: recipient.name,
                        })}{" "}
                        <span className="text-gray-400">&lt;{recipient.email}&gt;</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Subject</label>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className={inputClass}
                placeholder="New arrivals at Mono"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Message</label>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className={`${inputClass} min-h-36 resize-y`}
                placeholder={"Hi {{name}},\n\nWe wanted to share..."}
                required
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Use <code className="rounded bg-gray-100 px-1">{"{{name}}"}</code> for the
                recipient&apos;s name. Sent via Resend from your backend.
              </p>
            </div>

            {body.trim() ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Email preview (MONO theme)
                </p>
                <p className="mb-2 text-xs text-gray-500">
                  Subject: <span className="font-medium text-gray-800">{subject || "—"}</span>
                </p>
                <iframe
                  title="Email preview"
                  srcDoc={previewHtml}
                  className="h-80 w-full rounded-lg border border-gray-200 bg-white"
                  sandbox=""
                />
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || (!sendToAll && !validRecipients.length)}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            >
              {isSending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              {isSending ? "Sending..." : "Send email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
