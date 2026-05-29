# Admin email API (Resend)

The dashboard calls these **admin-only** endpoints. Implement on the mono backend with Resend (`RESEND_API_KEY`, verified domain).

## Environment (backend `.env` only — not the dashboard)

Add to **`backend/.env`** (no `NEXT_PUBLIC_` prefix). Restart the API after changing.

```env
RESEND_API_KEY=re_xxxx
RESEND_FROM_EMAIL=hello@yourdomain.com
RESEND_FROM_NAME=Mono
```

The dashboard never calls Resend directly; it only calls `POST /api/v1/admin/emails/*`.

## POST /api/v1/admin/emails/send

Single recipient.

```json
{
  "to": "user@example.com",
  "subject": "Hello",
  "html": "<p>Hi Jane,</p>",
  "text": "Hi Jane,"
}
```

Response:

```json
{
  "status": "success",
  "data": { "sent": 1, "failed": 0 }
}
```

## POST /api/v1/admin/emails/bulk

Resolve `userIds` from MongoDB, personalize `{{name}}` in `html`/`text`, send via Resend per user.

## POST /api/v1/admin/emails/bulk-all

Email every user in the database that has an email address.

```json
{
  "subject": "Sale",
  "html": "<p>Hi {{name}},</p>",
  "text": "Hi {{name}},",
  "onlyActive": true
}
```

`onlyActive` defaults to `true` (skips users with `isActive: false`). Set `onlyActive: false` to include inactive accounts.

```json
{
  "userIds": ["664f...", "664a..."],
  "subject": "Sale",
  "html": "<p>Hi {{name}},</p>",
  "text": "Hi {{name}},"
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "sent": 42,
    "failed": 1,
    "errors": [{ "userId": "...", "email": "bad@", "message": "Invalid email" }]
  }
}
```

Requires admin cookie (`token`) like other admin routes.

## HTML template

The API wraps message HTML in a **MONO-branded layout** (black header/footer, white body, “Shop now” CTA). Send only the inner fragment (e.g. `<p>...</p>`), not a full document.

Optional backend env:

```env
STORE_URL=https://mono-eg.shop
```
