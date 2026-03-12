# Development Setup Guide

## Overview

TakeNotes is a TypeScript monorepo using pnpm and Turbo for workspace management. The project consists of:

- **apps/mobile**: React Native app with Expo and Expo Router
- **apps/api**: Fastify backend with Supabase integration
- **packages/shared**: Shared types, enums, schemas, and contracts
- **infra**: Local development infrastructure (Docker Compose)

## Prerequisites

Before setting up the project, ensure you have:

- **Node.js**: version 20 or later (20.x LTS recommended)
- **pnpm**: version 9 or later
- **Docker**: for running local Redis
- **Git**: for cloning the repository
- **Supabase account**: for database and authentication (free tier available at https://supabase.com)

Install pnpm globally if not already installed:

```bash
npm install -g pnpm@9
```

Verify versions:

```bash
node --version
pnpm --version
docker --version
```

## Cloning and Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd TakeNotes
```

### 2. Install dependencies

From the project root, install all workspace dependencies:

```bash
pnpm install
```

This installs dependencies for the root, mobile app, API, and shared package.

## Supabase Setup

### 1. Create a Supabase project

1. Go to https://supabase.com and sign in or create an account
2. Create a new project with:
   - A project name (e.g., "TakeNotes Dev")
   - A strong database password
   - Region closest to you
3. Wait for the project to initialize (typically 1–2 minutes)

### 2. Retrieve Supabase credentials

In the Supabase dashboard:

1. Go to **Settings** → **API** section
2. Copy these values:
   - **Project URL**: this is your `SUPABASE_URL`
   - **anon public**: this is your `SUPABASE_ANON_KEY`
   - **Service role secret**: this is your `SUPABASE_SERVICE_ROLE_KEY`

Keep these secure; do not commit them to git.

### 3. Run database migrations

The migrations are not yet committed to the repository. For Phase 2, the `users` table is handled via Supabase Auth's built-in user records.

When Supabase initializes your project, you must ensure the `users` profile table exists:

1. Go to **SQL Editor** in your Supabase dashboard
2. Create a new query
3. Run this SQL:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  locale TEXT NOT NULL DEFAULT 'en-US',
  appearance_mode TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to read only their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update only their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Allow service role to upsert (needed by API)
CREATE POLICY "Service role can manage all profiles" ON users
  USING (auth.role() = 'service_role');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_timestamp_trigger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_timestamp();
```

## Delivery Channel Setup (Phase 6+)

Phase 6 adds support for three delivery channels: push notifications, email, and Telegram. Setting up these channels is optional for local development but required for testing reminder delivery.

### Push Notifications (Expo)

Push notifications use Expo's infrastructure and require an Expo account.

**Setup:**

1. Go to https://expo.dev and sign in or create an account
2. Create a new Expo project or use an existing one
3. In the Expo dashboard, go to **Account** → **Access Tokens**
4. Create a new token with the name "TakeNotes Dev"
5. Copy the token and add to `apps/api/.env`:
   ```
   EXPO_ACCESS_TOKEN=<your-token>
   ```

**Testing:**

When you run the mobile app with `pnpm dev`, it will automatically:
1. Request permission to send push notifications
2. Obtain an Expo push token from the device
3. Register the token with the API via `POST /devices/register-push-token`

To verify registration:

```bash
# Get an auth token from Supabase, then:
curl -H "Authorization: Bearer <token>" http://localhost:3000/devices
```

When a reminder is due, the push notification will be sent to all active registered devices.

### Email (Resend)

Email reminders use Resend, a transactional email service.

**Setup:**

1. Go to https://resend.com and sign up for a free account
2. Navigate to **API Keys** in the dashboard
3. Create a new API key
4. Copy the key and add to `apps/api/.env`:
   ```
   RESEND_API_KEY=<your-api-key>
   ```

**Testing:**

1. Create a reminder with "email" in the delivery channels
2. When the reminder is due, the API will call Resend to send an email
3. Check the Resend dashboard to verify the email was sent
4. Or query the delivery logs:
   ```bash
   # In Supabase SQL Editor
   select channel, status, error_message from reminder_delivery_logs
   where channel = 'email'
   order by attempted_at desc
   limit 5;
   ```

**In development**, emails are sent to the user's registered email address.

### Telegram

Telegram reminders require setting up a Telegram bot and connecting it to your API.

**Setup:**

1. **Create the bot**:
   - Go to https://t.me/BotFather (Telegram)
   - Send `/newbot` and follow the prompts
   - Copy the bot token (format: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
   - Add to `apps/api/.env`:
     ```
     TELEGRAM_BOT_TOKEN=<your-bot-token>
     ```

2. **Set up the webhook**:
   - Generate a random secret (32+ characters):
     ```bash
     openssl rand -base64 32
     ```
   - Add to `apps/api/.env`:
     ```
     TELEGRAM_WEBHOOK_SECRET=<random-secret>
     ```
   - Set the webhook URL on your bot (instructions below for development)

3. **Generate app deep link**:
   - When running the mobile app locally with Expo, it will output a deep link like:
     ```
     exp://192.168.1.100:8081
     ```
   - Add to `apps/api/.env`:
     ```
     APP_DEEP_LINK_BASE=exp://192.168.1.100:8081
     ```

**Setting up the webhook in development:**

For local development, you need to expose your API to the internet so Telegram can call the webhook. Use a tunneling service like **ngrok**:

1. **Install ngrok**: https://ngrok.com/download

2. **Start ngrok**:
   ```bash
   ngrok http 3000
   ```
   This outputs a URL like `https://abc123.ngrok.io`.

3. **Register the webhook** (one-time setup or after ngrok URL changes):
   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://abc123.ngrok.io/integrations/telegram/webhook",
       "secret_token": "<your-TELEGRAM_WEBHOOK_SECRET>"
     }' \
     https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook
   ```

4. **Verify the webhook**:
   ```bash
   curl https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
   ```
   Expected response:
   ```json
   {
     "ok": true,
     "result": {
       "url": "https://abc123.ngrok.io/integrations/telegram/webhook",
       "has_custom_certificate": false,
       "pending_update_count": 0
     }
   }
   ```

**Testing Telegram in development:**

1. In the mobile app, go to **Settings** → **Notification Channels** → **Telegram**
2. Tap **Connect Telegram**
3. The app displays a verification token and instructions to message the bot
4. Open Telegram and search for your bot (name you gave it to BotFather)
5. Send: `/start <verification-token>`
   - Example: `/start verify_abc123def456`
6. The bot webhook will receive the message and verify the connection
7. The mobile app will show **Connected** and Telegram is now available as a delivery channel

**Verifying the connection:**

```bash
# Get an auth token from Supabase, then:
curl -H "Authorization: Bearer <token>" http://localhost:3000/integrations/telegram/status
```

Expected response when verified:
```json
{
  "success": true,
  "data": {
    "isConnected": true,
    "isVerified": true,
    "telegramUserId": "123456789",
    "username": "john_doe"
  }
}
```

**Troubleshooting Telegram webhook:**

If the webhook is not working:

1. Check the ngrok URL is still active (ngrok may reassign IPs)
2. Verify the secret token matches `TELEGRAM_WEBHOOK_SECRET` in `.env`
3. Check API logs for webhook errors:
   ```
   [Channels] Received Telegram webhook update...
   ```
4. Verify the bot's webhook info: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
5. Test the webhook manually:
   ```bash
   curl -X POST \
     -H "X-Telegram-Bot-Api-Secret-Token: <secret>" \
     -H "Content-Type: application/json" \
     -d '{
       "update_id":123,
       "message":{
         "message_id":1,
         "date":1615624800,
         "chat":{"id":987654321,"type":"private"},
         "from":{"id":987654321,"is_bot":false,"first_name":"John"},
         "text":"/start verify_token_here"
       }
     }' \
     https://your-ngrok-url/integrations/telegram/webhook
   ```

## Environment Configuration

### API environment (.env)

Create a file `apps/api/.env` with the following variables:

```
NODE_ENV=development
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
REDIS_URL=redis://localhost:6379
SENTRY_DSN=
RESEND_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
EXPO_ACCESS_TOKEN=
APP_DEEP_LINK_BASE=
```

**Required fields** for Phase 2:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL`

**Required fields** for Phase 6 (Delivery channels):
- `RESEND_API_KEY` – from Resend (https://resend.com)
- `TELEGRAM_BOT_TOKEN` – from Telegram BotFather
- `TELEGRAM_WEBHOOK_SECRET` – any random secret string for validating Telegram webhook calls
- `EXPO_ACCESS_TOKEN` – from Expo (for push notifications)
- `APP_DEEP_LINK_BASE` – your app's deep link scheme (e.g., `exp://localhost:8081`)

Optional fields can be left empty for earlier phases; they are needed for email, Telegram, push, and error tracking.

### Mobile environment (.env)

Create a file `apps/mobile/.env` with the following variables:

```
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_SENTRY_DSN=
```

**Required fields** for Phase 2:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:3000` if not set, but explicit is better)

Optional:
- `EXPO_PUBLIC_SENTRY_DSN` can be left empty for local development

### Environment validation

The API validates all required environment variables at startup using Zod. If a required variable is missing, the server will refuse to start with a clear error message.

## Local Infrastructure Setup

### Start Redis via Docker Compose

From the project root:

```bash
docker-compose -f infra/docker-compose.yml up -d
```

This starts a Redis container on `localhost:6379` with persistent data volume.

To verify Redis is running:

```bash
docker ps | grep takenotes-redis
```

To stop Redis:

```bash
docker-compose -f infra/docker-compose.yml down
```

To stop and remove all data:

```bash
docker-compose -f infra/docker-compose.yml down -v
```

## Running the Monorepo

### Development mode (both apps)

From the project root, start both the mobile app and API in development mode:

```bash
pnpm dev
```

This runs `turbo run dev`, which concurrently starts:
- **Mobile app**: Expo development server (usually on `http://localhost:8081`)
- **API**: Fastify server on port 3000

You should see output from both apps. The mobile app will display a QR code you can scan with the Expo Go app or an iOS/Android simulator.

### Running individual apps

#### Mobile app only

```bash
cd apps/mobile
pnpm dev
```

Or from root:

```bash
pnpm dev --filter=@takenotes/mobile
```

#### API only

```bash
cd apps/api
pnpm dev
```

Or from root:

```bash
pnpm dev --filter=@takenotes/api
```

## Available Commands

### Root level (runs across all packages)

| Command | Description |
|---------|------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages for production |
| `pnpm lint` | Run ESLint on all packages |
| `pnpm typecheck` | Run TypeScript type checking on all packages |
| `pnpm test` | Run all tests across packages |

### App-specific commands

Run these from the app directory or use `--filter` flag from root.

#### Mobile app

From `apps/mobile/`:

| Command | Description |
|---------|------------|
| `pnpm dev` | Start Expo development server |
| `pnpm build` | Export optimized bundle for distribution |
| `pnpm lint` | Lint source code and app directory |
| `pnpm typecheck` | Check TypeScript types |
| `pnpm test` | Run Jest test suite |

#### API

From `apps/api/`:

| Command | Description |
|---------|------------|
| `pnpm dev` | Start Fastify server with hot reload |
| `pnpm build` | Compile TypeScript to JavaScript |
| `pnpm start` | Run compiled JavaScript (after build) |
| `pnpm lint` | Lint source code |
| `pnpm typecheck` | Check TypeScript types |
| `pnpm test` | Run Vitest test suite |

## Common Operations

### Testing auth flow

1. Start both the API and mobile app:
   ```bash
   pnpm dev
   ```

2. In the mobile app, navigate to the Sign Up screen
3. Create a test account with email and password
4. After sign-up, you should be routed to the Notes tab
5. Open Settings to verify profile data and theme switching works

### Checking API connectivity

Test the health endpoint from your terminal:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","uptime":0.123}
```

Test the ready endpoint:

```bash
curl http://localhost:3000/ready
```

Expected response:
```json
{"status":"ready"}
```

Test the authenticated `/me` endpoint:

```bash
# First, get an auth token from Supabase (use a test account)
# Then:
curl -H "Authorization: Bearer <your-token>" http://localhost:3000/me
```

### Rebuilding types and dependencies

If you encounter type errors after pulling changes, rebuild:

```bash
pnpm install
pnpm typecheck
```

### Clearing build artifacts

To clean all build outputs and start fresh:

```bash
rm -rf apps/*/dist
rm -rf apps/*/.expo
pnpm install
pnpm build
```

## Troubleshooting

### "Cannot find module '@takenotes/shared'"

This usually means the shared package wasn't installed or built. Run:

```bash
pnpm install
pnpm build --filter=@takenotes/shared
```

### Redis connection failed

If you get `ERR! Error: connect ECONNREFUSED 127.0.0.1:6379`:

1. Ensure Docker is running: `docker --version`
2. Start Redis: `docker-compose -f infra/docker-compose.yml up -d`
3. Verify it's running: `docker ps | grep takenotes-redis`

### API won't start: "Invalid environment configuration"

Check that all required env variables are set:

```bash
cat apps/api/.env
# Verify SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, and REDIS_URL are not empty
```

### Mobile app crashes on sign-in

1. Verify `apps/mobile/.env` has correct Supabase URL and anon key
2. Check that the API is running: `curl http://localhost:3000/health`
3. Ensure the users table exists in Supabase (run migrations from "Supabase Setup" section above)
4. Check mobile app logs in Expo terminal output

### TypeScript errors in IDE

If your editor shows type errors that tests don't:

1. Ensure `tsconfig.base.json` is recognized by your IDE
2. Restart your TypeScript language server (in VSCode: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server")
3. Run `pnpm typecheck` to see what the actual errors are

## Next Steps

After the environment is fully set up:

1. Test the complete auth flow (sign up, sign in, sign out)
2. Open Settings and verify theme switching works
3. Run the test suites to ensure everything works:
   ```bash
   pnpm test
   ```
4. Check that types are correct:
   ```bash
   pnpm typecheck
   ```

For information about the API endpoints, see [API Reference](./api.md).

For architecture details, see [Architecture Overview](./architecture.md).

## Running and Monitoring the Scheduler (Phase 5+)

Phase 5 introduces BullMQ workers for reminder delivery. The scheduler runs automatically alongside the API server and requires Redis to be available.

### Worker Startup

Workers are started automatically when the API starts in development mode. This is configured in `apps/api/src/workers/index.ts` and called during server initialization.

**When you run:**

```bash
pnpm dev
```

The output will include:

```
[Worker] Reminder delivery worker started
```

This indicates the reminder worker is ready to process queued jobs. Workers run in the same Node process as the API server, so no separate startup commands are needed.

### Redis Requirement

The scheduler requires Redis to be running. This is the same Redis used for session storage and caching.

**Verify Redis is running:**

```bash
docker ps | grep takenotes-redis
```

Expected output:
```
container-id  takenotes-redis:latest  ...  Up ...
```

**If Redis is not running:**

Start it with:

```bash
docker-compose -f infra/docker-compose.yml up -d
```

If the API starts without Redis, it will fail with an error like:

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

The entire API will refuse to start because Redis is required for queue initialization.

### Verifying Jobs Are Being Created

When a reminder is created or updated, a job is persisted to `reminder_jobs` table. You can verify jobs are being scheduled without running the worker.

**Query the reminder_jobs table:**

Open a Supabase SQL editor or use `psql` if you have direct database access:

```sql
select id, reminder_id, job_key, status, scheduled_for, created_at
from public.reminder_jobs
order by created_at desc
limit 10;
```

Expected output (after creating a reminder):
```
id                                   | reminder_id | job_key                              | status    | scheduled_for
─────────────────────────────────────┼─────────────┼──────────────────────────────────────┼───────────┼──────────────────────────────
abc123...                            | def456...   | def456...:2026-03-12T15:00:00Z:v1  | scheduled | 2026-03-12 15:00:00+00
xyz789...                            | ghi012...   | ghi012...:2026-03-13T10:30:00Z:v1  | scheduled | 2026-03-13 10:30:00+00
```

**Status values to expect:**

- `scheduled`: Job is queued and waiting for the scheduled time to arrive
- `processing`: Worker is currently executing the job
- `completed`: Job executed and delivery succeeded
- `cancelled`: Reminder was completed or cancelled before the job executed
- `superseded`: Reminder was snoozed or edited; a newer job replaced this one
- `failed`: Job executed but delivery failed after retries

### Monitoring Delivery Logs

After a job is processed, delivery attempts are logged in `reminder_delivery_logs` table. Each channel (push, email, telegram) gets a separate log entry with an idempotency key.

**Query delivery logs:**

```sql
select reminder_id, channel, status, idempotency_key, error_message, attempted_at
from public.reminder_delivery_logs
order by attempted_at desc
limit 20;
```

Expected output:
```
reminder_id             | channel | status | idempotency_key                    | error_message | attempted_at
────────────────────────┼─────────┼────────┼────────────────────────────────────┼───────────────┼──────────────────────────
def456...               | push    | sent   | def456...:2026-03-12T15:00:00Z:push| NULL          | 2026-03-12 15:00:30+00
def456...               | email   | failed | def456...:2026-03-12T15:00:00Z:email| "Provider rate limit exceeded" | 2026-03-12 15:00:31+00
```

**What each status means:**

- `pending`: Delivery attempt was recorded but not yet sent
- `sent`: Channel delivery succeeded
- `failed`: Channel delivery failed (may be retried by BullMQ)
- `skipped`: Channel was skipped due to idempotency (already sent in a prior attempt)

### Understanding Job Lifecycle

When a reminder is created or snoozed, here's what happens:

1. **API receives create/snooze request** → Creates/updates the reminder record
2. **Scheduler schedules the job** → Inserts into `reminder_jobs` with status `'scheduled'`, enqueues BullMQ job
3. **Time passes** → Redis-backed delay mechanism waits for the scheduled time
4. **Worker picks up job** → Transitions job status to `'processing'`
5. **Worker re-checks reminder state** → Verifies reminder still exists and is active; if not, job is skipped
6. **Orchestrator sends across channels** → Creates delivery log entries, calls channel providers
7. **Job completes** → Transitions job status to `'completed'`, delivery logs show `'sent'` or `'failed'`

### What Happens When Redis Is Down

If Redis becomes unavailable after the API starts:

**Immediate effect:**
- New reminder creations will fail with an error
- Snoozed reminders will fail to reschedule
- The API will respond with a 500 error (or graceful degradation, depending on implementation)

**Queued jobs:**
- Jobs waiting to execute remain safe in Redis persistence (if Redis is restarted with `--appendonly yes`)
- Workers will resume processing when Redis is restored

**User experience:**
- Users will see an error message when trying to create or snooze a reminder
- The reminder record may be created but not scheduled
- On retry, the API will attempt to schedule the job again

### Accessing Logs

Worker and scheduler logs are output to stdout in the same terminal where `pnpm dev` is running.

**Worker logs:**
```
[Worker] Processing job reminder-id:2026-03-12T15:00:00Z:v1 for reminder reminder-id
[Worker] Job reminder-id:2026-03-12T15:00:00Z:v1 completed successfully
```

**Scheduler logs:**
```
[Scheduler] Scheduled job reminder-id:2026-03-12T15:00:00Z:v1 for reminder reminder-id at 2026-03-12T15:00:00Z
[Scheduler] Superseded job job-id for reminder reminder-id
```

**Delivery logs:**
```
[Delivery] push → reminder reminder-id: sent
[Delivery] email → reminder reminder-id: failed
[Delivery] Skipping duplicate send for key reminder-id:2026-03-12T15:00:00Z:v1:push
```

All logs include reminder ID and job key for debugging and correlation with database records.

### Restarting Workers

Workers are automatically managed by the API process. To restart them:

1. Stop the API: Press `Ctrl+C` in the terminal running `pnpm dev`
2. Start it again: `pnpm dev`

The worker will reinitialize and resume processing queued jobs from Redis.

### Troubleshooting Scheduler Issues

**Symptoms: Jobs are created but never execute**

1. Verify Redis is running: `docker ps | grep takenotes-redis`
2. Verify worker is started: Check for `[Worker] Reminder delivery worker started` in logs
3. Check job status in database: `select status, count(*) from reminder_jobs group by status`
   - If many jobs are stuck in `'processing'`, worker may have crashed mid-execution
   - Manually reset: `update reminder_jobs set status = 'scheduled' where status = 'processing'` and restart worker

**Symptoms: Reminders are being sent multiple times**

1. Check `reminder_delivery_logs` for duplicate idempotency keys: `select idempotency_key, count(*) from reminder_delivery_logs group by idempotency_key having count(*) > 1`
2. If duplicates exist but status is `'sent'` for all: This is expected on retries (idempotency prevents duplicates at provider)
3. If status shows `'sent'` multiple times for the same idempotency key: Database constraint is broken; this should not happen

**Symptoms: "Redis connection failed" errors**

1. Ensure Docker is running: `docker --version`
2. Restart Redis: `docker-compose -f infra/docker-compose.yml restart`
3. Verify connection string in `apps/api/.env`: `REDIS_URL=redis://localhost:6379`
4. Test Redis directly: `redis-cli ping` (if redis-cli is installed) or `telnet localhost 6379`

## Deep Link Configuration and Testing (Phase 7+)

The TakeNotes app supports deep linking for reminders, allowing users to open a specific reminder via push notifications, URL schemes, or direct links.

### Deep Link URL Scheme

The app uses the `takenotes://` URL scheme for deep links. This must be configured in the Expo project configuration.

#### Expo Configuration

In `apps/mobile/app.json`:

```json
{
  "expo": {
    "scheme": "takenotes",
    "plugins": ["expo-router"],
    "android": {
      "scheme": "takenotes"
    },
    "ios": {
      "scheme": "takenotes"
    }
  }
}
```

The `scheme` field defines the protocol. With this config:
- Deep links have the format: `takenotes://reminders/{reminderId}`
- Push notifications can include deep links
- URL handlers in the app capture and route these links

### Testing Deep Links with Expo Go

When running the app with `pnpm dev`, Expo provides two URL schemes:

1. **Expo scheme** (for Expo Go app): `exp://192.168.x.x:8081` (printed in terminal)
2. **Your custom scheme**: `takenotes://` (configured in app.json)

The custom scheme `takenotes://` works with simulators and production builds, but **not** with Expo Go. For Expo Go testing, use the `exp://` scheme.

#### Testing on iOS Simulator

1. **Start the dev server**:
   ```bash
   pnpm dev
   ```
   Note the Expo URL output (e.g., `exp://192.168.1.100:8081`).

2. **Open Simulator and test a deep link**:
   ```bash
   # Opens the app at reminders screen for specific reminder
   xcrun simctl openurl booted "takenotes://reminders/550e8400-e29b-41d4-a716-446655440004"
   ```

3. **Expected behavior**: The app should navigate to the reminder detail screen for that reminder ID.

4. **Or test cold start** (app not running):
   ```bash
   # Kill the app first
   xcrun simctl terminate booted com.example.takenotes
   # Then trigger the deep link
   xcrun simctl openurl booted "takenotes://reminders/550e8400-e29b-41d4-a716-446655440004"
   ```
   App should launch and automatically navigate to the reminder.

#### Testing on Android Emulator

1. **Start the dev server**:
   ```bash
   pnpm dev
   ```

2. **Open emulator and test a deep link**:
   ```bash
   adb shell am start -a android.intent.action.VIEW -d "takenotes://reminders/550e8400-e29b-41d4-a716-446655440004"
   ```

3. **Expected behavior**: The app should navigate to the reminder detail screen.

4. **Test cold start** (app not running):
   ```bash
   # Kill the app first
   adb shell am force-stop com.example.takenotes
   # Then trigger the deep link
   adb shell am start -a android.intent.action.VIEW -d "takenotes://reminders/550e8400-e29b-41d4-a716-446655440004"
   ```

### Testing Deep Links with Push Notifications

When a reminder is due and the push notification is delivered, the app should navigate to the reminder when the user taps the notification.

#### Simulating a Push Notification Tap

The app's `Notifications.addNotificationResponseReceivedListener` handler in `app/_layout.tsx` simulates the notification tap:

1. Create a test reminder with a past due time and push notification channel selected
2. The scheduler will immediately attempt to send the push notification
3. On a real device, the notification appears on the lock screen; tapping it triggers the deep link
4. In simulator, use Expo's notification testing tools to simulate a tap

#### Manual Testing with Expo Notifications

For manual testing without waiting for the scheduler:

```typescript
// In your app or test script
import * as Notifications from 'expo-notifications'

await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Reminder Test',
    body: 'Tap to open',
    data: {
      reminderId: '550e8400-e29b-41d4-a716-446655440004',
    },
  },
  trigger: {
    seconds: 2,  // Trigger in 2 seconds
  },
})
```

After 2 seconds, the notification appears. Tapping it triggers `addNotificationResponseReceivedListener`, which extracts the `reminderId` and navigates to `/reminders/{id}`.

### URL Scheme vs Expo Scheme

| Scheme | Format | Use Case | Works with Expo Go |
|--------|--------|----------|-------------------|
| `takenotes://` | `takenotes://reminders/{id}` | Production builds, manual testing, push notifications | No (custom scheme only) |
| `exp://` | `exp://192.168.x.x:8081/reminders/{id}` | Development with Expo Go | Yes (Expo Go compatible) |

**In development**, the app supports both schemes simultaneously. The router handles `takenotes://` URLs natively, and Expo handles `exp://` URLs.

### Troubleshooting Deep Links

**Symptoms: Deep link doesn't work on iOS simulator**

1. Verify the scheme is configured in `app.json`:
   ```bash
   grep -A 5 '"scheme"' apps/mobile/app.json
   ```

2. Ensure the app is installed in the simulator:
   ```bash
   xcrun simctl list devices
   ```

3. Try a simpler URL first (without query params or dynamic segments):
   ```bash
   xcrun simctl openurl booted "takenotes://reminders"
   ```

4. Check app logs in Xcode to see if the URL is being captured.

**Symptoms: Deep link doesn't work on Android emulator**

1. Verify the deep link intent filter is configured (Expo configures this automatically)

2. Try the ADB command:
   ```bash
   adb shell am start -a android.intent.action.VIEW -d "takenotes://reminders/550e8400-e29b-41d4-a716-446655440004"
   ```

3. Check Android logcat:
   ```bash
   adb logcat | grep takenotes
   ```

4. Verify the reminder ID exists by checking the API:
   ```bash
   curl -H "Authorization: Bearer <token>" http://localhost:3000/reminders/550e8400-e29b-41d4-a716-446655440004
   ```

**Symptoms: Notification tap doesn't navigate**

1. Verify the notification payload includes `reminderId` in `data`:
   ```typescript
   // In push.service.ts or your test
   const payload = {
     data: {
       reminderId: reminder.id,
     },
   }
   ```

2. Check that `Notifications.addNotificationResponseReceivedListener` is registered in `app/_layout.tsx`

3. Verify the reminder exists and the ID is correct

4. Check app logs for errors during navigation:
   ```bash
   # iOS
   xcrun simctl spawn booted log stream --level debug --predicate 'eventMessage contains "reminders"'

   # Android
   adb logcat | grep reminders
   ```

### Push Notification Testing

For testing push notifications without waiting for the scheduler, use Expo's Notifications API directly in development:

```typescript
import * as Notifications from 'expo-notifications'

// Simulate receiving a notification (for debugging the handler)
Notifications.scheduleNotificationAsync({
  content: {
    title: 'Test Reminder',
    body: 'Tap to open in app',
    data: {
      reminderId: '550e8400-e29b-41d4-a716-446655440004',
    },
  },
  trigger: { seconds: 1 },
})
```

---

## Running Tests

### API tests

```bash
cd apps/api
pnpm test
```

This runs Vitest in run mode (single pass). Tests mock the Supabase client and scheduler so no live database or Redis is required.

To run with coverage:

```bash
pnpm test -- --coverage
```

### Mobile tests

```bash
cd apps/mobile
pnpm test
```

This runs Jest with the `jest-expo` preset.

### All tests from root

```bash
pnpm test
```

This runs `turbo run test` which executes tests in all packages concurrently.

---

## Running the Worker Separately

By default, the BullMQ worker starts in the same process as the API server. If you need to run it in a separate process (e.g., for horizontal scaling):

1. Create `apps/api/src/worker-entrypoint.ts`:
   ```typescript
   import { initSentry } from './lib/sentry'
   initSentry()
   import { startAllWorkers } from './workers/index'
   startAllWorkers()
   console.log('Worker process started')
   ```

2. Build and run:
   ```bash
   cd apps/api
   pnpm build
   node dist/worker-entrypoint.js
   ```

The worker requires the same environment variables as the API (Supabase, Redis, Sentry, and provider credentials).

---

## Production Builds

### Building the API for production

```bash
cd apps/api
pnpm build        # Compiles TypeScript to dist/
pnpm start:prod   # Runs node dist/index.js
```

Required environment variables for production — see `apps/api/.env.example`.

### Building the mobile app with EAS

The mobile app uses [EAS Build](https://docs.expo.dev/build/introduction/) for production builds.

**Prerequisites:**

```bash
npm install -g eas-cli
eas login
```

**Configure the project (one-time):**

```bash
cd apps/mobile
eas build:configure
```

**Build for internal testing (preview):**

```bash
eas build --platform all --profile preview
```

**Build for production:**

```bash
eas build --platform all --profile production
```

**Development build (replaces Expo Go for testing native features):**

```bash
eas build --platform all --profile development
```

EAS build profiles are defined in `apps/mobile/eas.json`.

**Expo Go limitations:**

Expo Go does not support:
- Custom native modules (e.g., sentry-expo requires a dev client or production build)
- Push notifications in the Expo Go sandbox on physical devices for testing background delivery
- Custom URL scheme handlers in all versions

For full push notification testing, use an EAS development build or a production build.

**Submit to stores:**

```bash
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

Or send one directly from the terminal via Expo's API (requires your project's Expo credentials).

---

## Release Status

### Phase 8 Complete — MVP Ready for Release

All development phases are complete. TakeNotes is ready for beta testing and production deployment.

#### What is Complete

**Core Features**:
- ✓ Authentication (email/password sign-up and sign-in)
- ✓ Notes with folders and themes
- ✓ Reminders with state transitions, snooze, and recurrence
- ✓ Archive for completed reminders and archived notes
- ✓ Organize (folders and themes management)
- ✓ Settings (appearance, notifications, channel management)

**Delivery Channels**:
- ✓ Push notifications (Expo)
- ✓ Email (Resend)
- ✓ Telegram (Bot API)

**Search and Navigation**:
- ✓ Full-text search across notes and reminders
- ✓ Filtering by folder, theme, status, date
- ✓ Deep linking for notification taps
- ✓ Timezone-aware date views

**Reliability**:
- ✓ Sentry error tracking (API and mobile)
- ✓ Structured logging with Pino
- ✓ BullMQ job scheduling with Redis
- ✓ Row-level security and ownership enforcement
- ✓ Idempotent delivery logic
- ✓ Comprehensive test coverage

**Operations**:
- ✓ EAS build profiles (development, preview, production)
- ✓ Production API configuration validation
- ✓ Health and readiness endpoints
- ✓ Queue and delivery monitoring

#### Deployment Checklist

Before releasing to production:

- [ ] Set up Sentry project and add DSN to both apps
- [ ] Configure production Supabase project with strong passwords and RLS verified
- [ ] Set up production email delivery (Resend account and API key)
- [ ] Set up Telegram bot and configure webhook
- [ ] Set up Expo push notification credentials
- [ ] Run full test suite: `pnpm test`
- [ ] Run type checking: `pnpm typecheck`
- [ ] Build mobile apps with EAS: `eas build --platform all --profile production`
- [ ] Verify deep links work on both platforms
- [ ] Test all three delivery channels end-to-end
- [ ] Review security guide and confirm all RLS policies in place
- [ ] Set up monitoring alerts in Sentry and database

#### Known Limitations and Future Work

The following are intentionally out of scope for MVP but documented for future enhancement:

- Collaboration and shared items
- File attachments or media uploads
- Voice notes or transcription
- AI-powered features
- Desktop or web client
- External calendar sync
- Location-based reminders
- Offline-first sync

#### Getting Help During Release

- **Architecture questions**: See [Architecture Overview](./architecture.md)
- **Deployment issues**: See [Operations Guide](./operations.md)
- **Security verification**: See [Security Guide](./security.md)
- **API integration**: See [API Reference](./api.md)
