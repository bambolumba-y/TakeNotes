# TakeNotes

A personal notes and reminders mobile app for iOS and Android.

TakeNotes helps you organize your thoughts, manage tasks, and stay on top of reminders with flexible delivery options (push notifications, email, Telegram). The app is designed for personal organization with a clean, intuitive interface and robust backend infrastructure.

## Project Overview

TakeNotes is a full-featured personal productivity app with:

- **Notes**: Free-form text records with folders, themes, and search
- **Reminders**: Actionable items with due dates, recurring schedules, and multi-channel delivery
- **Archive**: Completion history for reminders and archived notes
- **Organization**: Folders and themes for flexible categorization
- **Settings**: Appearance (light/dark), notification preferences, delivery channel management

The app runs on iOS and Android via Expo and React Native, backed by a Node.js API with PostgreSQL storage and Redis-based job scheduling.

## Monorepo Structure

TakeNotes uses a structured monorepo with clear separation of concerns:

```
root/
├── apps/
│   ├── mobile/                  # React Native Expo app
│   └── api/                     # Fastify backend API
├── packages/
│   └── shared/                  # Shared types, enums, contracts
├── infra/                       # Docker infrastructure (Redis)
├── docs/                        # Project documentation
├── package.json                 # Workspace root config
├── pnpm-workspace.yaml          # Workspace definition
├── turbo.json                   # Task orchestration
└── tsconfig.base.json           # Shared TypeScript config
```

## Quick Start

> **Running on a VPS?** Skip to [VPS Deployment](#vps-deployment) below.
> **Need domain + config setup?** See the [VPS Setup Guide](./docs/vps-setup.md) — covers domain DNS, Supabase, Resend, Telegram, Expo, and Sentry.

### Prerequisites (Local Development)

- **Node.js** 20.x LTS or later
- **pnpm** 9.x or later
- **Docker** (for local Redis)
- **Git**
- **Supabase account** (free tier at https://supabase.com)

### 1. Clone and Install

```bash
git clone https://github.com/bambolumba-y/TakeNotes.git
cd TakeNotes
pnpm install
```

### 2. Set Up Supabase

1. Create a project at https://supabase.com
2. Go to **Settings** → **API** and copy:
   - Project URL → `SUPABASE_URL`
   - anon public key → `SUPABASE_ANON_KEY`
   - Service role secret → `SUPABASE_SERVICE_ROLE_KEY`

3. Run migrations in your Supabase SQL Editor:

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

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can manage all profiles" ON users
  USING (auth.role() = 'service_role');

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

(Full migration scripts are in the codebase or see [Development Setup Guide](./docs/development.md) for complete schema.)

### 3. Environment Setup

**API configuration** (`apps/api/.env`):

```bash
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

**Mobile configuration** (`apps/mobile/.env`):

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_SENTRY_DSN=
```

See [Development Setup Guide](./docs/development.md) for detailed instructions and optional delivery channel configuration.

### 4. Start Redis

```bash
docker-compose -f infra/docker-compose.yml up -d
```

Verify Redis is running:

```bash
docker ps | grep takenotes-redis
```

### 5. Run Development Servers

```bash
pnpm dev
```

This starts both the mobile app (Expo) and API server concurrently.

- **Mobile**: Scan the QR code with Expo Go or use an iOS/Android simulator
- **API**: Running on `http://localhost:3000`

### 6. Test the App

1. Sign up in the mobile app
2. Create a note and reminder
3. Navigate through all tabs
4. Check Settings for theme switching

## Key Commands

```bash
# Development (all apps)
pnpm dev

# Run individual app
pnpm dev --filter=@takenotes/mobile
pnpm dev --filter=@takenotes/api

# Build for production
pnpm build

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Run tests
pnpm test

# Clean build artifacts (Linux/macOS)
rm -rf apps/*/dist apps/*/.expo
```

## Tech Stack

### Frontend
- **React Native** with **Expo**
- **Expo Router** for navigation
- **TypeScript** with strict mode
- **Zustand** for state management
- **TanStack Query** for server state
- **React Hook Form** for form handling
- **Zod** for validation

### Backend
- **Node.js** 20.x LTS
- **Fastify** HTTP framework
- **TypeScript** with strict mode
- **PostgreSQL** via Supabase
- **Redis** for queuing and caching
- **BullMQ** for job scheduling
- **Sentry** for error tracking
- **Pino** for structured logging

### External Services
- **Supabase Auth** for authentication
- **Expo Push Notifications** for push delivery
- **Resend** for email delivery
- **Telegram Bot API** for Telegram delivery
- **Sentry** for error monitoring

## Documentation

Complete project documentation is in the `docs/` directory:

| Document | Purpose |
|----------|---------|
| [Architecture Overview](./docs/architecture.md) | System design, data flow, integration patterns |
| [Development Setup](./docs/development.md) | Installation, configuration, running locally, troubleshooting |
| [API Reference](./docs/api.md) | Endpoint specifications, request/response schemas |
| [Operations Guide](./docs/operations.md) | Monitoring, queue management, incident response |
| [Security Guide](./docs/security.md) | Row-level security, auth, secret management, threat model |
| [VPS Setup Guide](./docs/vps-setup.md) | Domain DNS, all config values, firewall, Telegram webhook |

## Project Status

**Phase 8 Complete — MVP Ready for Release**

All 8 phases of development are complete:

- **Phase 1-2**: Auth, user profiles, settings
- **Phase 3**: Notes, folders, themes
- **Phase 4**: Reminders, archive, state transitions
- **Phase 5**: BullMQ scheduler, job persistence
- **Phase 6**: Push, email, Telegram delivery
- **Phase 7**: Search, filters, deep linking, product completeness
- **Phase 8**: Sentry monitoring, structured logging, security hardening, test expansion, EAS build configuration, production readiness

The app is ready for beta testing and App Store/Play Store submission.

---

## VPS Deployment

This section covers deploying the **API + Redis** on a Linux VPS (Ubuntu/Debian). The mobile app is distributed via Expo — it does not run on the server.

### Server Requirements

- Ubuntu 22.04 LTS or Debian 12 (recommended)
- 1 GB RAM minimum (2 GB recommended)
- 20 GB disk
- Open ports: `22` (SSH), `80` (HTTP), `443` (HTTPS), `3000` (API, or proxy it)

### 1. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # should print v20.x.x
```

### 2. Install pnpm

```bash
npm install -g pnpm
pnpm -v
```

### 3. Install Redis

```bash
sudo apt-get install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping   # should print PONG
```

Redis listens on `127.0.0.1:6379` by default (no external exposure needed).

### 4. Clone the repo

```bash
git clone https://github.com/bambolumba-y/TakeNotes.git
cd TakeNotes
pnpm install --frozen-lockfile
```

### 5. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
nano apps/api/.env
```

Fill in all values. Required at minimum:

```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
REDIS_URL=redis://127.0.0.1:6379
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
EXPO_ACCESS_TOKEN=
APP_DEEP_LINK_BASE=takenotes://
SENTRY_DSN=
LOG_LEVEL=info
```

### 6. Build and run the API

```bash
cd apps/api
pnpm build          # compiles TypeScript → dist/
pnpm start:prod     # node dist/index.js
```

To keep the process alive, use **PM2**:

```bash
npm install -g pm2
pm2 start dist/index.js --name takenotes-api --cwd apps/api
pm2 save
pm2 startup        # follow the printed command to enable on boot
```

Monitor logs:

```bash
pm2 logs takenotes-api
pm2 status
```

### 7. (Optional) Reverse proxy with Nginx + HTTPS

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/takenotes`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/takenotes /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com
```

After this your API is reachable at `https://api.yourdomain.com`.

### 8. Point the mobile app at the VPS

In `apps/mobile/.env`, set:

```env
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
```

Then rebuild the mobile app with EAS:

```bash
cd apps/mobile
npx eas build --profile production --platform all
```

### 9. Telegram webhook (if using Telegram delivery)

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://api.yourdomain.com/integrations/telegram/webhook" \
  -d "secret_token=<YOUR_TELEGRAM_WEBHOOK_SECRET>"
```

### Updating the server

```bash
cd TakeNotes
git pull
pnpm install --frozen-lockfile
cd apps/api && pnpm build
pm2 restart takenotes-api
```

---

## Getting Help

- **Bugs or issues**: Check [troubleshooting](./docs/development.md#troubleshooting) section
- **Architecture questions**: See [Architecture Overview](./docs/architecture.md)
- **API integration**: See [API Reference](./docs/api.md)
- **Production deployment**: See [Operations Guide](./docs/operations.md)

## License

[To be determined]

---

**For developers**: Start with [Development Setup](./docs/development.md). For operators and architects, see [Architecture Overview](./docs/architecture.md).
