-- Folders
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  icon text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.folders enable row level security;
create policy "Folders: owner access" on public.folders
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_folders_user_id on public.folders(user_id);

create trigger folders_updated_at before update on public.folders
  for each row execute function public.handle_updated_at();

-- Themes
create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  icon text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.themes enable row level security;
create policy "Themes: owner access" on public.themes
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_themes_user_id on public.themes(user_id);

create trigger themes_updated_at before update on public.themes
  for each row execute function public.handle_updated_at();
