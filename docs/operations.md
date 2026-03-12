# Operations Guide — TakeNotes

This document covers production operations: monitoring queues, handling delivery failures, rotating secrets, and debugging delivery issues.

---

## 1. Queue Monitoring — BullMQ Job Status

Jobs are stored in both Redis (BullMQ) and PostgreSQL (`reminder_jobs` table).

### Check job counts in Redis

Use the BullMQ dashboard or the CLI. With `redis-cli`:

```bash
# Connect to Redis
redis-cli -u $REDIS_URL

# List all BullMQ keys for the reminder-delivery queue
KEYS bull:reminder-delivery:*

# Check waiting jobs count
LLEN bull:reminder-delivery:wait

# Check delayed jobs count
ZCARD bull:reminder-delivery:delayed

# Check active (processing) jobs
LLEN bull:reminder-delivery:active

# Check failed jobs
ZCARD bull:reminder-delivery:failed
```

### Check job status in PostgreSQL

```sql
-- Overview of all job statuses
SELECT status, COUNT(*) as count
FROM reminder_jobs
GROUP BY status
ORDER BY count DESC;

-- Jobs currently processing (worker may have crashed if many are stuck)
SELECT id, reminder_id, job_key, status, created_at
FROM reminder_jobs
WHERE status = 'processing'
ORDER BY created_at ASC;

-- Recently failed jobs
SELECT id, reminder_id, job_key, status, last_error, created_at
FROM reminder_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;

-- Jobs scheduled in the next hour
SELECT id, reminder_id, job_key, scheduled_for
FROM reminder_jobs
WHERE status = 'scheduled'
  AND scheduled_for BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
ORDER BY scheduled_for ASC;
```

---

## 2. Worker Restart Behavior

Workers are started in the same process as the API server (`apps/api/src/index.ts`). There is no separate worker process in the current configuration.

**Restart the worker:**
1. Stop the API: `pm2 stop takenotes-api` (or `Ctrl+C` if running manually)
2. Start it again: `pm2 start takenotes-api` (or `node dist/index.js`)

**If jobs are stuck in `processing` status:**

This happens when the worker crashed mid-execution. Reset them:

```sql
-- Reset stuck processing jobs back to scheduled so they will be retried
UPDATE reminder_jobs
SET status = 'scheduled', last_error = 'Reset after worker crash'
WHERE status = 'processing'
  AND created_at < NOW() - INTERVAL '10 minutes';
```

Then restart the worker. Note: resetting to `scheduled` re-enqueues via BullMQ only if a new job is created — consider manually re-enqueueing for critical reminders if needed.

**Running the worker separately from the API (optional):**

If you want to run the worker as a separate process in production, extract it:

```bash
# In apps/api, create a worker entrypoint:
# src/worker-entrypoint.ts
import { startAllWorkers } from './workers/index'
startAllWorkers()

# Build and run separately:
node dist/worker-entrypoint.js
```

---

## 3. What To Do When a Delivery Fails Repeatedly

### Step 1: Identify the failure

```sql
-- Find repeatedly failing delivery logs for a specific reminder
SELECT channel, status, error_message, attempted_at, idempotency_key
FROM reminder_delivery_logs
WHERE reminder_id = '<reminder-uuid>'
ORDER BY attempted_at DESC
LIMIT 20;
```

Look for patterns in `error_message`:
- `"No active device tokens"` → user has not registered a push token or all tokens are inactive
- `"No verified Telegram connection"` → user has not completed Telegram setup
- `"No email on profile"` → user profile has no email address
- Provider-specific errors (e.g., `"rate limit"`, `"invalid token"`) → credentials issue

### Step 2: Check worker logs

Structured logs include `reminder_id`, `job_key`, and `channel_type`. Search for these fields:

```bash
# If using journald:
journalctl -u takenotes-api | grep '"reminder_id":"<uuid>"'

# If using file logs:
grep '"reminder_id":"<uuid>"' /var/log/takenotes/api.log
```

Key fields to look for in logs:
- `reminder_id` — identifies the affected reminder
- `job_key` — correlates BullMQ job with `reminder_jobs` table entry
- `channel_type` — which delivery channel failed (push, email, telegram)
- `err_message` — the actual error from the provider
- `idempotency_key` — used to prevent duplicate sends across retries

### Step 3: Verify provider credentials

Check the relevant provider for the failed channel:
- **Push**: Expo dashboard → Logs → Filter by push token errors
- **Email**: Resend dashboard → Logs → Search by recipient or message ID
- **Telegram**: Check bot is active and webhook is registered (`getWebhookInfo`)

### Step 4: Manual retry

If BullMQ retries are exhausted, manually trigger redelivery by resetting the job:

```sql
-- Reset a failed job to allow re-processing
UPDATE reminder_jobs
SET status = 'scheduled', last_error = NULL
WHERE id = '<reminder-job-uuid>';
```

Then create a new BullMQ job by updating the reminder's `due_at` via the API (which calls `supersedePendingJobs` + `scheduleReminderJob`).

---

## 4. Rotating Secrets

### Rotate Telegram bot token

1. Go to Telegram BotFather → send `/revoke` to the bot
2. BotFather provides a new token
3. Update `TELEGRAM_BOT_TOKEN` in your environment / secret manager
4. Re-register the webhook with the new token:
   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"url": "https://api.yourdomain.com/integrations/telegram/webhook", "secret_token": "<TELEGRAM_WEBHOOK_SECRET>"}' \
     https://api.telegram.org/bot<NEW_TOKEN>/setWebhook
   ```
5. Restart the API
6. Verify with: `curl https://api.telegram.org/bot<NEW_TOKEN>/getWebhookInfo`

### Rotate Telegram webhook secret

1. Generate a new secret: `openssl rand -base64 32`
2. Update `TELEGRAM_WEBHOOK_SECRET` in environment
3. Re-register the webhook with the new secret (same `setWebhook` call as above)
4. Restart the API — the old secret is immediately invalid

### Rotate Resend API key

1. Log in to Resend → API Keys → Revoke the old key
2. Create a new key
3. Update `RESEND_API_KEY` in environment
4. Restart the API
5. Send a test reminder to confirm delivery

### Rotate Supabase service role key

Only do this if the key has been compromised. It will invalidate all existing server sessions.

1. Supabase dashboard → Settings → API → Regenerate service role key
2. Update `SUPABASE_SERVICE_ROLE_KEY` in environment
3. Restart the API

### Rotate Expo access token

1. Expo dashboard → Account → Access Tokens → Revoke old token
2. Create new token
3. Update `EXPO_ACCESS_TOKEN` in environment
4. Restart the API

---

## 5. Device Token Deactivation on User Logout

When a user logs out of the mobile app, their push token should be deactivated to prevent notifications from reaching a device that is no longer authenticated.

**How it works:**

The mobile app calls `DELETE /devices/:id` on logout, which calls `deactivateDeviceToken(userId, id)` in the devices service. This sets `is_active = false` for the specific token, scoped to the authenticated user.

**What to check if notifications continue after logout:**

```sql
-- Check if any active tokens exist for a user
SELECT id, token, platform, is_active, created_at
FROM device_tokens
WHERE user_id = '<user-uuid>'
ORDER BY created_at DESC;
```

If tokens are still active after logout, confirm the mobile app's logout flow calls the deactivation endpoint. The token ID should be stored in the app's local storage alongside the push token.

**Manual deactivation (support operation):**

```sql
UPDATE device_tokens
SET is_active = false
WHERE user_id = '<user-uuid>';
```

---

## 6. Log Fields for Debugging Delivery Failures

All structured logs from the worker and delivery service use pino and emit JSON. Key fields:

| Field | Description |
|-------|-------------|
| `reminder_id` | UUID of the reminder being delivered |
| `job_id` | BullMQ internal job ID |
| `job_key` | Composite key: `{reminderId}:{scheduledFor}:{version}` |
| `reminder_job_id` | PostgreSQL `reminder_jobs.id` |
| `channel_type` | Delivery channel: `push`, `email`, or `telegram` |
| `idempotency_key` | `{job_key}:{channel}` — unique per send attempt |
| `err_message` | Error text from the provider or internal logic |
| `reminder_status` | Reminder status at time of processing |
| `db_job_status` | `reminder_jobs.status` at time of guard check |
| `snooze_until` | ISO timestamp if reminder was snoozed past scheduled time |
| `success` | `true` if the channel delivery succeeded |

**Example: finding all failed push deliveries in the last 24 hours:**

```bash
# Using jq to filter structured JSON logs
cat /var/log/takenotes/api.log \
  | jq 'select(.channel_type == "push" and .success == false)' \
  | jq '{time, reminder_id, err_message}'
```

**Note:** The following are intentionally NOT logged for security and privacy:
- Push token values
- Email addresses
- Telegram `chat_id` values
- Any secret credentials or API keys
