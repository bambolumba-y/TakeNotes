-- reminder_jobs: persistent metadata for every scheduled BullMQ job
create table if not exists public.reminder_jobs (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_type text not null default 'delivery',
  job_key text not null,
  queue_name text not null default 'reminder-delivery',
  scheduled_for timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled','processing','completed','cancelled','failed','superseded')),
  bullmq_job_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reminder_jobs enable row level security;
create policy "ReminderJobs: owner access" on public.reminder_jobs
  using (auth.uid() = user_id);

create index idx_reminder_jobs_reminder_id on public.reminder_jobs(reminder_id);
create index idx_reminder_jobs_status on public.reminder_jobs(status) where status = 'scheduled';

create trigger reminder_jobs_updated_at before update on public.reminder_jobs
  for each row execute function public.handle_updated_at();

-- reminder_delivery_logs: idempotency log per channel attempt
create table if not exists public.reminder_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  reminder_job_id uuid references public.reminder_jobs(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('push','email','telegram')),
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  idempotency_key text not null unique,
  provider_response jsonb,
  error_message text,
  attempted_at timestamptz not null default now()
);

alter table public.reminder_delivery_logs enable row level security;
create policy "DeliveryLogs: owner access" on public.reminder_delivery_logs
  using (auth.uid() = user_id);

create index idx_delivery_logs_reminder on public.reminder_delivery_logs(reminder_id);
create index idx_delivery_logs_idem on public.reminder_delivery_logs(idempotency_key);
