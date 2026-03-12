-- Device tokens for push notifications
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  token text not null,
  app_version text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.device_tokens enable row level security;
create policy "DeviceTokens: owner access" on public.device_tokens
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_device_tokens_user_active on public.device_tokens(user_id, is_active) where is_active = true;

create trigger device_tokens_updated_at before update on public.device_tokens
  for each row execute function public.handle_updated_at();

-- Telegram connections
create table if not exists public.telegram_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  telegram_user_id text,
  chat_id text,
  username text,
  verification_token text unique,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.telegram_connections enable row level security;
create policy "TelegramConnections: owner access" on public.telegram_connections
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_telegram_connections_user on public.telegram_connections(user_id);
create index idx_telegram_connections_token on public.telegram_connections(verification_token) where is_verified = false;

create trigger telegram_connections_updated_at before update on public.telegram_connections
  for each row execute function public.handle_updated_at();

-- Extend reminder_delivery_logs with missing fields (table created in Phase 5)
alter table public.reminder_delivery_logs
  add column if not exists sent_at timestamptz,
  add column if not exists provider_message_id text;
