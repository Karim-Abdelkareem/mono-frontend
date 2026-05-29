const DEFAULT_STORE_URL = "https://mono-eg.shop";
const DEFAULT_BRAND = "MONO";
const DEFAULT_CONTACT = "monoshop@mono-eg.shop";

export function isFullHtmlDocument(html: string) {
  const trimmed = html.trim().toLowerCase();
  return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
}

export function wrapEmailHtml(
  bodyHtml: string,
  options?: {
    brandName?: string;
    storeUrl?: string;
    contactEmail?: string;
    previewText?: string;
  },
) {
  if (!bodyHtml.trim()) return bodyHtml;
  if (isFullHtmlDocument(bodyHtml)) return bodyHtml;

  const brandName = options?.brandName || DEFAULT_BRAND;
  const storeUrl = (options?.storeUrl || DEFAULT_STORE_URL).replace(/\/$/, "");
  const contactEmail = options?.contactEmail || DEFAULT_CONTACT;
  const previewText = options?.previewText || "";

  const preheader = previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${previewText}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${brandName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Georgia,'Times New Roman',Times,serif;">
  ${preheader}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background-color:#000000;padding:28px 32px;text-align:center;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:22px;font-weight:600;letter-spacing:0.28em;color:#ffffff;text-transform:uppercase;">
                ${brandName}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#111827;">
              <div style="color:#111827;">${bodyHtml}</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
                <tr>
                  <td style="border-radius:8px;background-color:#111827;">
                    <a href="${storeUrl}/shop" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Shop now
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#000000;padding:24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#9ca3af;text-align:center;">
              <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;letter-spacing:0.2em;color:#ffffff;">
                ${brandName}
              </p>
              <p style="margin:0 0 12px;">
                <a href="${storeUrl}" style="color:#d1d5db;text-decoration:underline;">mono-eg.shop</a>
              </p>
              <p style="margin:0;color:#6b7280;">
                Questions? <a href="mailto:${contactEmail}" style="color:#9ca3af;text-decoration:underline;">${contactEmail}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
