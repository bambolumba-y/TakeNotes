-- Notes
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  content_plain text not null default '',
  folder_id uuid references public.folders(id) on delete set null,
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  color_override text,
  icon_override text,
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;
create policy "Notes: owner access" on public.notes
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_notes_user_updated on public.notes(user_id, updated_at desc);
create index idx_notes_user_archived on public.notes(user_id, is_archived);
create index idx_notes_user_folder on public.notes(user_id, folder_id);

create trigger notes_updated_at before update on public.notes
  for each row execute function public.handle_updated_at();

-- Note-Theme join
create table if not exists public.note_themes (
  note_id uuid not null references public.notes(id) on delete cascade,
  theme_id uuid not null references public.themes(id) on delete cascade,
  primary key (note_id, theme_id)
);

alter table public.note_themes enable row level security;
create policy "NoteThemes: owner access" on public.note_themes
  using (
    exists (
      select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid()
    )
  );
