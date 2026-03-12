# Security Audit — TakeNotes API

This document records the security posture of the TakeNotes API as reviewed during Phase 8 hardening.

---

## 1. Row Level Security (RLS) Policies

All user-owned tables have RLS enabled in Supabase. The API uses the service role key exclusively for server-side operations, which bypasses RLS at the database level. The application enforces ownership in every query via explicit `user_id` WHERE clauses, providing defense in depth alongside RLS.

### Table: `users`
- `SELECT`: `auth.uid() = id`
- `UPDATE`: `auth.uid() = id`
- `ALL` for service role: `auth.role() = 'service_role'`

### Table: `notes`
- RLS enabled; service role bypasses for API writes.
- Application enforces: `.eq('user_id', userId)` on every read, write, and delete.

### Table: `reminders`
- RLS enabled; service role bypasses for API writes.
- Application enforces: `.eq('user_id', userId)` on every read, write, and delete.

### Table: `folders`
- RLS enabled.
- Application enforces: `.eq('user_id', userId)` on list, create, update, delete.

### Table: `themes`
- RLS enabled.
- Application enforces: `.eq('user_id', userId)` on all operations.

### Table: `note_themes` / `reminder_themes`
- RLS enabled.
- Application resolves and validates theme ownership before inserting relationship rows.

### Table: `device_tokens`
- RLS enabled.
- Application enforces: `.eq('user_id', userId)` on all operations.
- Push tokens from other users are never returned; cross-user token deactivation on re-register is scoped to `.neq('user_id', userId)` (the previous owner, not the new owner).

### Table: `telegram_connections`
- RLS enabled.
- Application enforces: `.eq('user_id', userId)` on connect, status, and disconnect.
- Verification is server-side only (see section 3).

### Table: `reminder_jobs`
- RLS enabled.
- Workers query by `reminder_id` and verify `user_id` on the related reminder before processing.

### Table: `reminder_delivery_logs`
- RLS enabled.
- Logs are written by the API worker using the service role. Users cannot read delivery logs directly.

---

## 2. Ownership Enforcement in API Queries

Every service module follows the same pattern: the authenticated `user_id` (from the verified JWT, never from the request body) is passed to every Supabase query as a WHERE clause filter.

### Pattern used in all service files:

```typescript
// Good: user_id comes from requireAuth middleware, not from client body
supabase.from('notes').select('*').eq('id', id).eq('user_id', userId)
```

Specific enforcement locations:

| Module | Method | Ownership Check |
|--------|--------|-----------------|
| `notes.service.ts` | `listNotes` | `.eq('user_id', userId)` |
| `notes.service.ts` | `getNoteById` | `.eq('id', id).eq('user_id', userId)` |
| `notes.service.ts` | `createNote` | `user_id: userId` in insert |
| `notes.service.ts` | `updateNote` | `.eq('id', id).eq('user_id', userId)` |
| `notes.service.ts` | `deleteNote` | `.eq('id', id).eq('user_id', userId)` |
| `notes.service.ts` | `pinNote` | `.eq('id', id).eq('user_id', userId)` |
| `notes.service.ts` | `archiveNote` | `.eq('id', id).eq('user_id', userId)` |
| `notes.service.ts` | `restoreNote` | `.eq('id', id).eq('user_id', userId)` |
| `reminders.service.ts` | All operations | `.eq('user_id', userId)` on every query |
| `folders.service.ts` | All operations | `.eq('user_id', userId)` on every query |
| `themes.service.ts` | All operations | `.eq('user_id', userId)` on every query |
| `devices.service.ts` | All operations | `.eq('user_id', userId)` on every query |
| `channels.service.ts` | All operations | `.eq('user_id', userId)` on every query |

Cross-user access returns `null` or an empty array. The API translates these to `404 Not Found`. No other user's data is ever included in a response.

---

## 3. Telegram Binding Security

The Telegram connection flow is fully server-side. The mobile client never supplies the `chat_id` or `telegram_user_id` directly.

**Flow:**

1. Client calls `POST /integrations/telegram/connect` (requires auth).
2. Server generates a random opaque token (`crypto.randomBytes(4).toString('hex')`), stores it in `telegram_connections` with `is_verified = false`, and returns it to the client.
3. User sends `/start <token>` to the Telegram bot from their Telegram account.
4. Telegram delivers the message to the bot webhook at `POST /integrations/telegram/webhook`.
5. **Webhook is validated by `X-Telegram-Bot-Api-Secret-Token` header** matching `TELEGRAM_WEBHOOK_SECRET` before any logic runs.
6. Server looks up the pending connection by verification token, sets `chat_id` and `telegram_user_id` from the Telegram message payload (not from the client), and marks `is_verified = true`.
7. The verification token is cleared after use (`verification_token: null`).

**Key properties:**
- The mobile app cannot forge or inject a `chat_id`.
- The webhook secret prevents replay attacks from unauthorized sources.
- Telegram user identity comes from Telegram's own server, not from client input.
- The `chat_id` is never logged (it is a sensitive user identifier).

---

## 4. Push Token Registration Scope

Push tokens are scoped to the authenticated user only.

- `POST /devices/register-push-token` requires auth; the `user_id` is taken from the JWT, not the request body.
- If a token was previously registered by another user (device shared/transferred), the old token is deactivated: `.update({ is_active: false }).eq('token', input.token).neq('user_id', userId)`.
- `getActiveTokensForUser(userId)` only returns tokens for the authenticated user: `.eq('user_id', userId).eq('is_active', true)`.
- Token values are never logged by the API.

---

## 5. Secret Environment Variables — Server-Side Only

The following variables are secrets and must never be exposed to the mobile client or committed to version control.

| Variable | Description | Client-Safe? |
|----------|-------------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Full DB access, bypasses RLS | **NO — server only** |
| `RESEND_API_KEY` | Email sending credentials | **NO — server only** |
| `TELEGRAM_BOT_TOKEN` | Bot authentication token | **NO — server only** |
| `TELEGRAM_WEBHOOK_SECRET` | Webhook validation secret | **NO — server only** |
| `EXPO_ACCESS_TOKEN` | Expo push sending credentials | **NO — server only** |
| `SENTRY_DSN` (API) | Error reporting endpoint | **NO — server only** |
| `SUPABASE_ANON_KEY` | Read-only anon access | Yes — client-safe |
| `SUPABASE_URL` | Supabase project URL | Yes — client-safe |
| `EXPO_PUBLIC_API_URL` | API base URL | Yes — client-safe |

**Mobile client uses only:**
- `EXPO_PUBLIC_SUPABASE_URL` — project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — anon key only

**Confirmed:** `apps/mobile/src/lib/supabase.ts` reads `EXPO_PUBLIC_SUPABASE_ANON_KEY`, not the service role key. The service role key exists only in `apps/api/src/lib/supabase.ts` and is loaded from `process.env` via server-side Zod validation.

---

## 6. Public Route Audit

Routes that do not require authentication:

| Route | Reason | Protection |
|-------|--------|------------|
| `GET /health` | Liveness probe | None required |
| `GET /ready` | Readiness probe | None required |
| `POST /integrations/telegram/webhook` | Telegram server push | Validated by `X-Telegram-Bot-Api-Secret-Token` header |

All other routes enforce `preHandler: [requireAuth]` which validates the Bearer JWT via Supabase Auth before the handler runs. Unauthenticated requests receive `401 Unauthorized`.

---

## 7. Input Validation

All request bodies are validated with Zod schemas before reaching service logic:

- `notes.schema.ts` — `createNoteBodySchema`, `updateNoteBodySchema`
- `reminders.schema.ts` — `createReminderBodySchema`, `updateReminderBodySchema`, `snoozeBodySchema`
- `folders.schema.ts` — folder create/update schemas
- `themes.schema.ts` — theme create/update schemas
- `users.schema.ts` — `updateMeSchema` (strips unknown fields; `user_id` cannot be injected)

The `updateMeSchema` does not include `user_id` as a valid field. Zod strips or rejects any `user_id` in the PATCH `/me` body. The service always uses `req.user!.id` from the verified token.

---

## 8. No Client-Side Trust for State Transitions

Completion, cancellation, and archiving of reminders are API-only operations. Clients cannot directly set `status`, `completed_at`, `cancelled_at`, or `archived_at` fields via the update body schema (`updateReminderBodySchema.partial()` does not include these fields). These transitions are enforced exclusively through dedicated endpoints:

- `POST /reminders/:id/complete` → sets `status=completed`, `completed_at=now()`
- `POST /reminders/:id/cancel` → sets `status=cancelled`, `cancelled_at=now()`
- `POST /reminders/:id/restore` → validates current status before allowing restoration
