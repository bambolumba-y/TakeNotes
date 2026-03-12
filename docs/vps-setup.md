# VPS Setup Guide — Domain, DNS, and Config Values

This guide walks through everything you need to get TakeNotes running on a VPS with a real domain and HTTPS, including exactly where to obtain each environment variable.

---

## 1. Get a Domain

### Where to buy
Any registrar works. Popular options:
- **Namecheap** — namecheap.com (affordable, good UI)
- **Cloudflare Registrar** — cloudflare.com/products/registrar (at-cost pricing, no markup)
- **GoDaddy** — godaddy.com (widely known)

A `.com` domain costs roughly $10–15/year. A `.dev` or `.app` domain costs $12–20/year.

### Recommendation
Buy through **Cloudflare Registrar** — you get free DNS management and DDoS protection automatically. If you buy elsewhere, you can still move DNS management to Cloudflare for free (just change nameservers at your registrar).

---

## 2. Point the Domain to Your VPS

### Step 1 — Find your VPS IP address
Log into your VPS provider dashboard and copy the **public IPv4 address** of your server. It looks like `123.45.67.89`.

### Step 2 — Add DNS records

Go to your domain's DNS settings (either at your registrar or Cloudflare).

Add these records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `api` | `123.45.67.89` | Auto |
| A | `@` | `123.45.67.89` | Auto (optional, for root domain) |

This makes `api.yourdomain.com` point to your server.

> **If using Cloudflare**: Set the proxy status to **DNS only** (grey cloud) for the `api` subdomain. The orange cloud (proxied) can interfere with some Telegram webhook and long-running connections.

### Step 3 — Wait for propagation

DNS changes take 1–60 minutes. You can check with:

```bash
nslookup api.yourdomain.com
# or
dig api.yourdomain.com
```

Once it returns your VPS IP, you are ready to proceed.

---

## 3. Config Values — Where to Get Each One

### `SUPABASE_URL` and keys

1. Go to **https://supabase.com** → sign up or log in
2. Click **New Project** → choose a name, password, and region close to your VPS
3. Wait for the project to provision (~2 minutes)
4. Go to **Project Settings** → **API**

You will find:

| Variable | Where | Label in Supabase |
|----------|-------|-------------------|
| `SUPABASE_URL` | Settings → API | **Project URL** |
| `SUPABASE_ANON_KEY` | Settings → API | **anon public** (under Project API keys) |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API | **service_role secret** (under Project API keys) |

> **Important**: The service role key bypasses Row Level Security. Never put it in the mobile app or expose it publicly. It goes only in `apps/api/.env` on the server.

### Run migrations

In the Supabase dashboard, go to **SQL Editor** and run the files from `apps/api/src/db/migrations/` in order:
- `001_users.sql`
- `002_folders_themes.sql`
- `003_notes.sql`
- `004_reminders.sql`
- `005_reminder_jobs.sql`
- `006_devices_telegram.sql`

Paste the contents of each file and click **Run**.

---

### `REDIS_URL`

Redis runs locally on the VPS (installed in the VPS setup steps). No external account needed.

```env
REDIS_URL=redis://127.0.0.1:6379
```

If you set a Redis password (recommended for production):

```bash
# In /etc/redis/redis.conf, add:
requirepass your-strong-redis-password
```

Then:
```env
REDIS_URL=redis://:your-strong-redis-password@127.0.0.1:6379
```

---

### `RESEND_API_KEY` and `RESEND_FROM_EMAIL`

Resend is the email delivery service.

1. Go to **https://resend.com** → sign up
2. Go to **API Keys** → **Create API Key**
   - Name it `takenotes-production`
   - Permission: **Full access**
   - Click **Add**
   - Copy the key immediately — it is only shown once

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

3. Go to **Domains** → **Add Domain**
   - Enter your domain (e.g. `yourdomain.com`)
   - Resend will give you DNS records to add (TXT and MX records)
   - Add those records in Cloudflare or your registrar's DNS panel
   - Click **Verify** in Resend after adding the records

4. Once verified, set the from address:

```env
RESEND_FROM_EMAIL=reminders@yourdomain.com
```

> **Free tier**: Resend allows 3,000 emails/month on the free plan. Enough for personal use.

---

### `TELEGRAM_BOT_TOKEN`

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Follow the prompts — choose a name and username for your bot (username must end in `bot`, e.g. `TakeNotesReminderBot`)
4. BotFather replies with your token:

```
Use this token to access the HTTP API:
7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

```env
TELEGRAM_BOT_TOKEN=7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Keep this token secret. Anyone with it can send messages as your bot.

---

### `TELEGRAM_WEBHOOK_SECRET`

This is a value **you choose yourself** — it is a random string used to verify that incoming webhook requests really come from Telegram.

Generate one:

```bash
openssl rand -hex 32
```

Example output: `a3f8c2e1d9b047f6a2c3e4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4`

```env
TELEGRAM_WEBHOOK_SECRET=a3f8c2e1d9b047f6a2c3e4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4
```

You will use this same value when registering the webhook with Telegram (step in the VPS deployment section of the README).

---

### `EXPO_ACCESS_TOKEN`

Required for sending push notifications through Expo's push service.

1. Go to **https://expo.dev** → sign up or log in
2. Go to **Account Settings** → **Access Tokens**
3. Click **Create Token**
   - Name it `takenotes-api`
   - Click **Create**
   - Copy the token

```env
EXPO_ACCESS_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

> Note: This token lets the API send push notifications to Expo-registered devices. It is different from the EAS token used for building the app.

---

### `APP_DEEP_LINK_BASE`

This is the URL scheme used to deep-link into the mobile app from push notifications and emails.

It matches the `scheme` field in `apps/mobile/app.json`:

```env
APP_DEEP_LINK_BASE=takenotes://
```

If you later set up Universal Links (iOS) or App Links (Android) with your real domain, this would change to something like `https://yourdomain.com`. For MVP, the custom scheme is sufficient.

---

### `SENTRY_DSN`

Sentry captures errors from both the API and mobile app.

1. Go to **https://sentry.io** → sign up (free tier available)
2. Click **Create Project**
   - Platform: **Node.js** (for the API)
   - Name: `takenotes-api`
3. After creating, Sentry shows your DSN. It looks like:

```
https://abc123def456@o123456.ingest.sentry.io/789012
```

```env
SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/789012
```

4. Create a second project for the mobile app:
   - Platform: **React Native**
   - Name: `takenotes-mobile`
   - Copy its DSN and put it in `apps/mobile/.env` as `EXPO_PUBLIC_SENTRY_DSN`

> Sentry free tier: 5,000 errors/month. More than enough for personal use.

---

### `NODE_ENV`, `PORT`, `LOG_LEVEL`

These do not require external accounts:

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

`PORT` is the port the API listens on internally. Nginx proxies external HTTPS traffic to this port, so the port itself does not need to be open in your firewall.

---

## 4. Complete `.env` for Production

Here is a complete `apps/api/.env` filled with all values once you have gathered them:

```env
# Runtime
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Supabase — from Settings → API in your Supabase project
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Redis — running locally on the VPS
REDIS_URL=redis://127.0.0.1:6379

# Email — from Resend dashboard
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=reminders@yourdomain.com

# Telegram — from BotFather + self-generated secret
TELEGRAM_BOT_TOKEN=7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_WEBHOOK_SECRET=a3f8c2e1d9b047f6a2c3...

# Push notifications — from Expo dashboard
EXPO_ACCESS_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Deep links
APP_DEEP_LINK_BASE=takenotes://

# Error tracking — from Sentry dashboard
SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/789012
```

---

## 5. Firewall Configuration

On Ubuntu, allow only the necessary ports:

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (Certbot + redirect)
sudo ufw allow 443/tcp     # HTTPS
sudo ufw deny 3000/tcp     # Block direct API access — use Nginx instead
sudo ufw deny 6379/tcp     # Block Redis from outside
sudo ufw enable
sudo ufw status
```

Your API is only reachable through Nginx over HTTPS. Redis and the raw API port are not externally accessible.

---

## 6. Register the Telegram Webhook

After your API is live at `https://api.yourdomain.com`, register the Telegram webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.yourdomain.com/integrations/telegram/webhook",
    "secret_token": "<YOUR_TELEGRAM_WEBHOOK_SECRET>"
  }'
```

Expected response:

```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

Verify it is active:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

---

## 7. Verify Everything Works

```bash
# Health check
curl https://api.yourdomain.com/health

# Ready check (also checks Redis)
curl https://api.yourdomain.com/ready
```

Both should return `{"status":"ok"}`.

Check API logs:

```bash
pm2 logs takenotes-api --lines 50
```

---

## 8. Quick Reference — Service Sign-up URLs

| Service | URL | Free tier |
|---------|-----|-----------|
| Supabase | https://supabase.com | 500 MB DB, 2 projects |
| Resend | https://resend.com | 3,000 emails/month |
| Expo | https://expo.dev | Unlimited push notifications |
| Sentry | https://sentry.io | 5,000 errors/month |
| Cloudflare | https://cloudflare.com | Free DNS + DDoS protection |
| BotFather | Telegram app → @BotFather | Free |
