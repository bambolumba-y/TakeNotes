-- Reminders
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  folder_id uuid references public.folders(id) on delete set null,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'active'
    check (status in ('active', 'completed', 'overdue', 'cancelled', 'archived')),
  due_at timestamptz not null,
  timezone text not null default 'UTC',
  repeat_rule jsonb not null default '{"type":"none"}'::jsonb,
  delivery_policy jsonb not null default '{"channels":["push"]}'::jsonb,
  snooze_until timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reminders enable row level security;
create policy "Reminders: owner access" on public.reminders
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_reminders_user_status_due on public.reminders(user_id, status, due_at);
create index idx_reminders_user_folder on public.reminders(user_id, folder_id);
create index idx_reminders_user_updated on public.reminders(user_id, updated_at desc);

create trigger reminders_updated_at before update on public.reminders
  for each row execute function public.handle_updated_at();

-- Reminder-Theme join
create table if not exists public.reminder_themes (
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  theme_id uuid not null references public.themes(id) on delete cascade,
  primary key (reminder_id, theme_id)
);

alter table public.reminder_themes enable row level security;
create policy "ReminderThemes: owner access" on public.reminder_themes
  using (
    exists (
      select 1 from public.reminders r where r.id = reminder_id and r.user_id = auth.uid()
    )
  );
