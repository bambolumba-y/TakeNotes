# Architecture Overview

## Monorepo Structure

TakeNotes uses a structured monorepo with clear separation of concerns:

```
root/
  apps/
    mobile/                 # React Native mobile app
    api/                    # Fastify backend API
  packages/
    shared/                 # Shared types, enums, contracts, schemas
  infra/                    # Docker Compose configurations
  docs/                     # Project documentation
  package.json             # Root workspace config
  pnpm-workspace.yaml      # pnpm workspace definition
  turbo.json               # Turbo task configuration
  tsconfig.base.json       # Shared TypeScript config
```

### Package responsibilities

- **apps/mobile**: React Native UI, state management, auth client, local theme
- **apps/api**: Fastify HTTP server, business logic, database access, auth verification
- **packages/shared**: Type definitions, validation schemas, enums, API contracts
- **infra**: Docker service definitions (Redis for development)

## Package Dependencies

```
mobile    ──depends on──→  shared
   ↑                         ↑
   └──────────API client─────┘

api       ──depends on──→  shared
   ↓
 PostgreSQL (Supabase)
 Redis
```

All type-safe communication between mobile and API is coordinated through shared contracts.

## Mobile App Architecture

### Directory structure

```
apps/mobile/
  app/                              # Expo Router navigation
    _layout.tsx                     # Root layout with auth split
    (auth)/
      _layout.tsx                   # Auth stack
      sign-in.tsx                   # Sign in screen
      sign-up.tsx                   # Sign up screen
      forgot-password.tsx           # Forgot password screen
    (tabs)/
      _layout.tsx                   # Tab shell
      notes.tsx                     # Notes tab
      reminders.tsx                 # Reminders tab
      archive.tsx                   # Archive tab
      organize.tsx                  # Organize tab
      settings.tsx                  # Settings tab
  src/
    components/                     # Reusable UI components
    features/                       # Feature modules (future: per-feature components)
    hooks/                          # Custom React hooks
    lib/                            # Library utilities
      supabase.ts                   # Supabase client
      api.ts                        # API client with auth
    services/                       # Business logic services
      auth.service.ts               # Auth operations
      profile.service.ts            # User profile operations
    store/                          # Zustand state stores
      auth.ts                       # Auth state and session
      profile.ts                    # User profile state
    theme/                          # Design system and theming
      tokens.ts                     # Design tokens (spacing, radius, etc)
      light.ts                      # Light theme colors
      dark.ts                       # Dark theme colors
      ThemeProvider.tsx             # Theme context provider
      useTheme.ts                   # Theme hook
    types/                          # App-specific types
```

### Authentication flow

1. **Initial load** (`_layout.tsx`):
   - `RootLayout` wraps app with `ThemeProvider`
   - `RootLayoutInner` listens for auth state changes via Supabase
   - Bootstrap session from storage via `getSession()`

2. **Auth state change**:
   - Supabase `onAuthStateChange` event updates `useAuthStore`
   - Router guards route based on session presence:
     - No session → route to `(auth)/sign-in`
     - Has session → route to `(tabs)/notes`

3. **Sign up flow**:
   - User fills sign-up form (email, password, optional display name)
   - Form validated with Zod
   - `signUp()` calls Supabase Auth
   - Backend auto-creates user profile via `GET /me` handler on first access
   - Router navigates to `(tabs)/notes`

4. **Sign in flow**:
   - User enters email and password
   - `signIn()` calls Supabase Auth
   - Session stored in AsyncStorage
   - Router navigates to tab shell

5. **Sign out flow**:
   - `signOut()` clears Supabase session
   - `useAuthStore` cleared
   - Router navigates back to `(auth)/sign-in`

### State management (Zustand)

#### Auth store

```typescript
interface AuthState {
  session: Session | null          // Current Supabase session
  user: User | null                // Current auth user
  isLoading: boolean               // Bootstrap state
  setSession(session): void        // Update session
  signOut(): Promise<void>         // Logout
}
```

Used by: Auth screens, root layout routing, any screen needing user identity.

#### Profile store

```typescript
interface ProfileState {
  profile: UserProfile | null      // User profile from API
  isLoading: boolean               // Fetch state
  fetch(): Promise<void>           // Fetch /me
  update(input): Promise<void>     // PATCH /me
}
```

Used by: Settings screen, any screen displaying user info.

### Theme system

#### Design tokens

All visual values come from `src/theme/tokens.ts`:

- **Radius**: xs (8px), sm (12px), md (16px), lg (20px), xl (24px), full (999px)
- **Spacing**: 1–10 scale (4px to 40px)
- **Typography**: display, title1, title2, sectionTitle, cardTitle, body, bodyStrong, caption, captionStrong, micro
- **Palette**: 8 user-selectable colors (blue, purple, pink, orange, green, teal, yellow, red)
- **Priority colors**: Map low/medium/high/urgent to palette colors

#### Light and dark theme colors

`src/theme/light.ts` and `src/theme/dark.ts` export color objects:

```typescript
{
  bg: { app, surface, surfaceSecondary, input }
  text: { primary, secondary, tertiary }
  border: { default }
  accent: { primary, primaryPressed, soft }
  status: { success, warning, error, info }
}
```

#### Theme context and provider

`ThemeProvider` manages:
- System/light/dark mode selection
- Persistence in AsyncStorage
- iOS/Android appearance detection
- Theme context accessible via `useTheme()`

#### Component pattern

All components consume theme via `useTheme()`:

```tsx
const theme = useTheme()
return <View style={{ backgroundColor: theme.colors.bg.surface }} />
```

No hardcoded colors are allowed in screens or components.

### API client

`src/lib/api.ts` provides authenticated fetch:

```typescript
async apiFetch<T>(path: string, init?: RequestInit): Promise<T>
```

- Automatically attaches Authorization header with Supabase token
- Throws on HTTP error
- Returns typed response

Used by all service functions to communicate with the API.

## API Architecture

### Directory structure

```
apps/api/
  src/
    index.ts                        # Entry point
    server.ts                       # Fastify app builder
    config/
      env.ts                        # Environment validation
      env.test.ts                   # Env validation tests
    db/                             # Database access (future)
    lib/
      auth.ts                       # Auth middleware
      supabase.ts                   # Supabase admin client
      redis.ts                      # Redis client (scaffolding)
    modules/
      health/                       # Health check routes
      users/                        # User profile routes (/me endpoints)
      notes/                        # Notes routes (future)
      reminders/                    # Reminder routes (future)
      archive/                      # Archive routes (future)
      folders/                      # Folder routes (future)
      themes/                       # Theme routes (future)
      channels/                     # Channel config routes (future)
      scheduler/                    # Job scheduling routes (future)
      delivery/                     # Delivery status routes (future)
      email/                        # Email delivery (future)
      push/                         # Push notification delivery (future)
      telegram/                     # Telegram delivery (future)
    queues/                         # BullMQ queue definitions (future)
    workers/                        # BullMQ worker processors (future)
    types/                          # API-specific types
```

### Server initialization

`server.ts` builds and configures Fastify:

```typescript
buildServer() {
  const app = Fastify({ logger: true })
  app.register(cors, { origin: true })
  app.register(healthRoutes, { prefix: '/' })
  app.register(usersRoutes, { prefix: '/' })
  return app
}
```

Routes are prefixed and can be added as modules grow.

### Authentication middleware

`lib/auth.ts` provides `requireAuth` hook:

1. Extracts `Authorization: Bearer <token>` header
2. Verifies token with Supabase using service role key
3. Attaches `request.user` if valid
4. Returns 401 if missing or invalid

Used by all protected routes.

### Environment validation

`config/env.ts` uses Zod to validate required env variables at startup:

```typescript
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  SUPABASE_URL: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  REDIS_URL: z.string().min(1),
  // ... optional integrations
})
```

If validation fails, the server refuses to start with a clear error message.

### Module pattern

Each module follows a consistent structure:

- `{module}.route.ts`: Route registration with Fastify
- `{module}.handler.ts`: Request/response handlers
- `{module}.service.ts`: Business logic and DB access
- `{module}.schema.ts`: Zod validation schemas for requests/responses

Example: `/me` endpoint

```
users/
  users.route.ts      → GET /me, PATCH /me
  users.handler.ts    → getMeHandler, patchMeHandler
  users.service.ts    → getUserProfile, updateUserProfile
  users.schema.ts     → updateMeSchema
  users.test.ts       → Handler and service tests
```

### Database access pattern

Database operations use Supabase JS client in admin mode:

```typescript
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()
```

Row-level security (RLS) policies protect data:
- Users can only read/update their own profile
- Service role can upsert during signup

## Shared Package

### Purpose

Centralize type definitions, validation schemas, and contracts to ensure mobile and API share one source of truth.

### Structure

```
packages/shared/
  src/
    enums/
      reminder-status.ts            # active, completed, overdue, cancelled, archived
      reminder-priority.ts          # low, medium, high, urgent
      reminder-channel.ts           # push, email, telegram
      theme-mode.ts                 # system, light, dark
      recurrence.ts                 # Recurrence patterns (future)
    types/
      api.ts                        # ApiResponse, Pagination, etc
    schemas/
      index.ts                      # Zod validation schemas
    contracts/
      auth.ts                       # SignIn, SignUp, ForgotPassword schemas
      user.ts                       # UserProfile, UpdateProfileInput
    constants/
      (future)
    index.ts                        # Barrel export
```

### Key exports

- Enums: `ReminderStatus`, `ReminderPriority`, `ReminderChannel`, `ThemeMode`
- Contracts: `signInSchema`, `signUpSchema`, `updateProfileSchema`
- Types: `UserProfile`, `UpdateProfileInput`, `ApiResponse`

Both mobile and API import from this package to stay in sync.

## Data Flow Examples

### Sign-up flow

1. **Mobile** collects email + password
2. Mobile validates with `signUpSchema` from shared
3. Mobile calls `signUp()` service → Supabase Auth
4. Backend auto-creates profile via `GET /me` on first auth
5. Mobile stores session in AsyncStorage
6. Mobile fetches profile with `fetchProfile()` → calls `GET /me`
7. Profile stored in `useProfileStore`

### Settings update flow

1. **Mobile** user selects theme mode in Settings
2. Mobile calls `theme.setMode()` → updates local theme immediately
3. Mobile calls `updateProfile({ appearanceMode: 'dark' })` → `PATCH /me`
4. API verifies auth, validates input, updates database
5. Response contains updated profile
6. Profile store updates, any watching component re-renders

### Security boundaries

- All authenticated endpoints guard with `requireAuth` middleware
- Server extracts user ID from Supabase token, never from request body
- RLS policies prevent cross-user access at database level
- Forms validated on both client (UX) and server (security)

## External integrations

### Supabase

- **Auth**: Email/password authentication, JWT tokens, session management
- **Database**: PostgreSQL with RLS policies
- **Admin SDK**: Used by API for profile management

### Redis

- Scaffolded in `apps/api/src/lib/redis.ts`
- Used by BullMQ for job scheduling (future phases)
- Persistent volume in Docker Compose for development

### Sentry (optional)

- Configuration templates in both mobile and API
- No-op if DSN not provided
- Ready for error tracking in production

## Testing strategy

- **Mobile**: Jest with React Native Testing Library
- **API**: Vitest with Fastify test utilities
- **Integration**: Tests for auth flow, profile CRUD, endpoint contracts

Tests ensure type safety, contract compliance, and critical path coverage.

## Phase 3: Core Data Model, Folders, Themes, and Notes

### Domain model additions

Phase 3 introduces the first complete feature domain with four new database tables:

#### `folders` table

Single-container organizational entity per user.

```sql
CREATE TABLE folders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

- Ownership: One per user (scoped by `user_id`)
- RLS policy: Users can only access their own folders
- Cascade: User deletion cascades folder deletion

#### `themes` table

Label entity for tagging notes and reminders (user-facing as "themes").

```sql
CREATE TABLE themes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

- Ownership: One per user (scoped by `user_id`)
- RLS policy: Users can only access their own themes
- Cascade: User deletion cascades theme deletion

#### `notes` table

Free-form content record with folder assignment and archival support.

```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  content_plain TEXT,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  color_override TEXT,
  icon_override TEXT,
  last_opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

- Ownership: One per user (scoped by `user_id`)
- Folder link: Nullable; deleting a folder sets `folder_id` to `null` (not cascade delete)
- Archives: `is_archived` flag controls visibility; archived notes appear in Archive tab
- Pins: `is_pinned` flag; archive operation automatically unpins
- Content: Both HTML (`content`) and plain-text (`content_plain`) stored; plain text used for search
- Timestamps: `last_opened_at` updated on each read

#### `note_themes` join table

Many-to-many relationship between notes and themes.

```sql
CREATE TABLE note_themes (
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, theme_id)
);
```

- Cascade: When a note is deleted, join rows are removed. When a theme is deleted, only join rows are removed (not notes).
- RLS policy: Access granted to note owner (subquery on `notes.user_id`)

### Indexing strategy

Performance indexes added for common queries:

```sql
CREATE INDEX idx_notes_user_updated ON notes(user_id, updated_at DESC);
CREATE INDEX idx_notes_user_archived ON notes(user_id, is_archived);
CREATE INDEX idx_notes_user_folder ON notes(user_id, folder_id);
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_themes_user_id ON themes(user_id);
```

### Ownership validation pattern

All endpoints validate ownership at the application layer by checking the authenticated user against resource `user_id`.

Example (notes service):

```typescript
// Verify folder ownership before assignment
const { data: folder } = await supabase
  .from('folders')
  .select('id')
  .eq('id', input.folderId)
  .eq('user_id', userId)  // Cross-user check
  .single()

if (!folder) throw new Error('Folder not found or not owned by user')

// Verify theme ownership before assignment
const { data: ownedThemes } = await supabase
  .from('themes')
  .select('id')
  .in('id', input.themeIds)
  .eq('user_id', userId)  // Enforce ownership
```

This prevents users from assigning other users' folders or themes to their notes.

### Search and filtering implementation

`GET /notes` supports server-side search, filtering, and sorting.

#### Search

Plain-text search across title and `content_plain`:

```typescript
if (query.q) {
  q = q.or(`title.ilike.%${query.q}%,content_plain.ilike.%${query.q}%`)
}
```

- Case-insensitive substring match (ilike = case-insensitive LIKE)
- Searches both title and plain content

#### Folder filter

```typescript
if (query.folderId) q = q.eq('folder_id', query.folderId)
```

Single-folder filter.

#### Theme filter

Theme filter applied post-query (join filter is complex in Supabase):

```typescript
if (query.themeId) {
  notes = notes.filter((n) => n.themes.some((t) => t.id === query.themeId))
}
```

Client-side filter on fetched results. This avoids complex Supabase join filtering.

#### Sorting

```typescript
const sortCol = query.sort ?? 'updated_at'
const ascending = (query.order ?? 'desc') === 'asc'
q = q.order(sortCol, { ascending })
```

Supported sort columns: `updated_at`, `created_at`, `title`
Order: `asc` or `desc`

### Archive behavior for notes

Notes are not deleted; they are marked with `is_archived: true`.

```typescript
export async function archiveNote(userId: string, id: string): Promise<Note> {
  const { error } = await supabase
    .from('notes')
    .update({ is_archived: true, is_pinned: false })
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  return (await getNoteById(userId, id))!
}
```

- Archiving automatically unpins the note.
- Restored notes return to active view with `is_archived: false`.
- Archive tab shows only `is_archived: true` notes (via `archived=true` query parameter).

### Theme deletion cascade

Deleting a theme removes only the join records, not content.

```typescript
export async function deleteTheme(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('themes').delete().eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
  // note_themes records deleted by FK cascade
}
```

The `note_themes` foreign key constraint on `theme_id` has `ON DELETE CASCADE`, so join rows are cleaned up automatically. Notes remain unaffected.

### Folder deletion nulling

Deleting a folder sets `folder_id` to `null` in all related notes.

```typescript
export async function deleteFolder(userId: string, id: string): Promise<void> {
  // Null out folder_id in notes first
  await supabase.from('notes').update({ folder_id: null }).eq('folder_id', id).eq('user_id', userId)
  const { error } = await supabase.from('folders').delete().eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
}
```

This prevents orphaned foreign key references and is done explicitly before deletion.

### Mobile state management for notes

Notes use Zustand for query state and optimistic updates.

#### Notes store

```typescript
interface NotesState {
  notes: Note[]
  archivedNotes: Note[]
  isLoading: boolean
  query: Partial<NoteQuery>
  setQuery(q: Partial<NoteQuery>): void
  fetch(): Promise<void>
  fetchArchived(): Promise<void>
  create(input: CreateNoteInput): Promise<Note>
  update(id: string, input: UpdateNoteInput): Promise<void>
  remove(id: string): Promise<void>
  pin(id: string): Promise<void>
  unpin(id: string): Promise<void>
  archive(id: string): Promise<void>
  restore(id: string): Promise<void>
}
```

#### Query state

Users can set filters via `setQuery()`:

```typescript
setQuery({ q: 'shopping', folderId: 'xxx', archived: 'false' })
fetch() // Refetch with new filters
```

The `query` object is preserved across re-renders; filtering happens server-side.

#### Optimistic updates

Methods like `pin()`, `archive()`, and `restore()` apply optimistic state changes before server confirmation:

```typescript
pin: async (id) => {
  const updated = await notesService.pin(id)
  set((s) => ({ notes: s.notes.map((n) => (n.id === id ? updated : n)) }))
}

archive: async (id) => {
  await notesService.archive(id)
  set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }))  // Optimistically remove
}

restore: async (id) => {
  const restored = await notesService.restore(id)
  set((s) => ({
    archivedNotes: s.archivedNotes.filter((n) => n.id !== id),
    notes: [restored, ...s.notes],
  }))
}
```

#### Folders and themes stores

Simpler stores for read/create/update/delete of folders and themes:

```typescript
interface FoldersState {
  folders: Folder[]
  isLoading: boolean
  fetch(): Promise<void>
  create(input: CreateFolderInput): Promise<void>
  update(id: string, input: UpdateFolderInput): Promise<void>
  remove(id: string): Promise<void>
}

interface ThemesState {
  themes: ThemeEntity[]
  isLoading: boolean
  fetch(): Promise<void>
  create(input: CreateThemeEntityInput): Promise<void>
  update(id: string, input: UpdateThemeEntityInput): Promise<void>
  remove(id: string): Promise<void>
}
```

Both apply optimistic updates to their arrays on success.

### Mobile services

Each store is backed by a typed service that calls the API:

#### Notes service

```typescript
export const notesService = {
  list: (query?: Partial<NoteQuery>) => apiFetch<ApiResponse<Note[]>>(...),
  get: (id: string) => apiFetch<ApiResponse<Note>>(...),
  create: (input: CreateNoteInput) => apiFetch<ApiResponse<Note>>(...),
  update: (id: string, input: UpdateNoteInput) => apiFetch<ApiResponse<Note>>(...),
  delete: (id: string) => apiFetch<void>(...),
  pin: (id: string) => apiFetch<ApiResponse<Note>>(...),
  unpin: (id: string) => apiFetch<ApiResponse<Note>>(...),
  archive: (id: string) => apiFetch<ApiResponse<Note>>(...),
  restore: (id: string) => apiFetch<ApiResponse<Note>>(...),
}
```

Services construct query parameters, handle URL building, and return typed responses.

#### Folders and themes services

Similar pattern for folders and themes:

```typescript
export const foldersService = {
  list: () => apiFetch<ApiResponse<Folder[]>>(...),
  create: (input: CreateFolderInput) => apiFetch<ApiResponse<Folder>>(...),
  update: (id: string, input: UpdateFolderInput) => apiFetch<ApiResponse<Folder>>(...),
  delete: (id: string) => apiFetch<void>(...),
}

export const themesService = {
  list: () => apiFetch<ApiResponse<ThemeEntity[]>>(...),
  create: (input: CreateThemeEntityInput) => apiFetch<ApiResponse<ThemeEntity>>(...),
  update: (id: string, input: UpdateThemeEntityInput) => apiFetch<ApiResponse<ThemeEntity>>(...),
  delete: (id: string) => apiFetch<void>(...),
}
```

### API module registration

Folders, themes, and notes routes are registered in `server.ts`:

```typescript
app.register(foldersRoutes, { prefix: '/' })
app.register(themesRoutes, { prefix: '/' })
app.register(notesRoutes, { prefix: '/' })
```

All routes apply `requireAuth` middleware, enforcing authentication for all operations.

## Phase 4: Reminders Domain, Archive Integration, and State Transitions

Phase 4 adds the second major content domain (Reminders) with full CRUD, state management, view filters, and archive integration.

### Reminder domain model

#### `reminders` table

Actionable item with due time, delivery channels, and recurrence support.

```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'overdue', 'cancelled', 'archived')),
  due_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  repeat_rule JSONB NOT NULL DEFAULT '{"type":"none"}'::jsonb,
  delivery_policy JSONB NOT NULL DEFAULT '{"channels":["push"]}'::jsonb,
  snooze_until TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Field descriptions**:

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Ownership; foreign key to `auth.users` |
| `title` | text | Required reminder title |
| `description` | text | Optional longer description |
| `folder_id` | UUID | Optional folder assignment; `ON DELETE SET NULL` |
| `priority` | text | One of: `low`, `medium`, `high`, `urgent` |
| `status` | text | State machine value (see below) |
| `due_at` | timestamptz | When the reminder is due (in UTC; interpret with `timezone`) |
| `timezone` | text | IANA timezone for due time interpretation (e.g., `"America/New_York"`) |
| `repeat_rule` | jsonb | Recurrence configuration (see below) |
| `delivery_policy` | jsonb | Selected delivery channels: `{ "channels": ["push", "email", "telegram"] }` |
| `snooze_until` | timestamptz | If set, reminder is snoozed until this time; null means not snoozed |
| `completed_at` | timestamptz | Timestamp when marked complete; null if not completed |
| `cancelled_at` | timestamptz | Timestamp when cancelled; null if not cancelled |
| `archived_at` | timestamptz | Timestamp when manually archived; null if not archived |
| `created_at` | timestamptz | When reminder was created |
| `updated_at` | timestamptz | When reminder was last modified (auto-updated by trigger) |

#### Indexes

```sql
CREATE INDEX idx_reminders_user_status_due ON reminders(user_id, status, due_at);
CREATE INDEX idx_reminders_user_folder ON reminders(user_id, folder_id);
CREATE INDEX idx_reminders_user_updated ON reminders(user_id, updated_at DESC);
```

These indexes support:
- View queries by user, status, and due date
- Folder filtering
- Recent-updates sorting

#### `reminder_themes` join table

Many-to-many relationship between reminders and themes (same pattern as `note_themes`).

```sql
CREATE TABLE reminder_themes (
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  PRIMARY KEY (reminder_id, theme_id)
);
```

- Cascade: When a reminder is deleted, all join rows are removed. When a theme is deleted, only join rows for that theme are removed (reminders unaffected).
- RLS policy: Access granted to reminder owner via subquery on `reminders.user_id`.

### Reminder status machine

Status values define reminder lifecycle:

```
        ┌─ completed (marked done)
        │
active ─┼─ cancelled (user cancels)
        │
        └─ archived (manual archive, appears in Archive)

overdue (virtual state; not a true status)
  └─ derived at query time: status='active' AND due_at < now AND snooze_until is null/past
```

#### Status details

| Status | Meaning | Where shown | Transitions | Timestamps |
|--------|---------|------------|-------------|-----------|
| `active` | Not yet completed or cancelled; may be overdue | Active/Today/Upcoming/Overdue views | → completed, cancelled, archived | None |
| `completed` | User marked as done | Archive tab only | → active (via restore) | `completed_at` set |
| `cancelled` | User cancelled | Not shown (hidden); restorable | → active (via restore) | `cancelled_at` set |
| `archived` | Manually archived | Archive tab only | → active (via restore) | `archived_at` set |
| `overdue` | Virtual: active reminder past due with no active snooze | Overdue view | → completed, cancelled | None (derived) |

#### Status transitions rules

- **Complete**: `active` → `completed` (sets `completed_at`)
- **Cancel**: Any → `cancelled` (sets `cancelled_at`)
- **Restore**: `completed`, `cancelled`, `archived` → `active` (clears all timestamp fields, clears `snooze_until`)
- **Cannot restore from**: `active` (error)

### Snooze behavior

`snooze_until` field temporarily removes a reminder from active views:

1. User opens a reminder with status `active`
2. User taps "Snooze"
3. Snooze time (future datetime) is provided, validated to be > now
4. `snooze_until` field is set; status remains `active`
5. Reminder is filtered out of view queries while `snooze_until > now`
6. When snooze expires (snooze_until becomes past), reminder re-enters appropriate views

**Query behavior**:

```sql
WHERE status = 'active'
  AND (snooze_until IS NULL OR snooze_until < now)
```

This condition is applied in list queries for `active`, `today`, `upcoming` views.

### Overdue detection

Overdue is **not** a persisted status; it is **derived** at query time:

```sql
WHERE status = 'active'
  AND due_at < now
  AND (snooze_until IS NULL OR snooze_until < now)
```

This means:
- An active reminder with `due_at` in the past is overdue
- If `snooze_until` is set to a future time, the reminder is **not** overdue (snooze is active)
- When snooze expires, reminder becomes overdue
- When user completes/cancels an overdue reminder, it transitions (does not remain overdue)

### Repeat rule structure (JSONB)

`repeat_rule` field is a discriminated union stored as JSONB:

```json
// None (no recurrence)
{ "type": "none" }

// Daily recurrence
{
  "type": "daily",
  "interval": 1,
  "endType": "never",
  "endCount": null,
  "endDate": null
}

// Weekly recurrence (with day-of-week filter)
{
  "type": "weekly",
  "interval": 2,
  "daysOfWeek": [1, 3, 5],
  "endType": "never",
  "endCount": null,
  "endDate": null
}

// Monthly recurrence
{
  "type": "monthly",
  "interval": 1,
  "endType": "after_count",
  "endCount": 12,
  "endDate": null
}

// Yearly recurrence
{
  "type": "yearly",
  "interval": 1,
  "endType": "on_date",
  "endCount": null,
  "endDate": "2027-03-12"
}

// Custom recurrence
{
  "type": "custom",
  "interval": 3,
  "daysOfWeek": [0, 6],
  "endType": "never",
  "endCount": null,
  "endDate": null
}
```

**Field meanings**:

| Field | Type | Meaning |
|-------|------|---------|
| `type` | enum | `"none"`, `"daily"`, `"weekly"`, `"monthly"`, `"yearly"`, `"custom"` |
| `interval` | number | How many periods (e.g., every 2 weeks) |
| `daysOfWeek` | number[] | For weekly/custom: 0–6 (0=Sunday, 6=Saturday) |
| `endType` | enum | `"never"`, `"after_count"`, `"on_date"` |
| `endCount` | number \| null | For `"after_count"`: repeat N times |
| `endDate` | string \| null | For `"on_date"`: stop after this date (ISO 8601) |

This structure is validated server-side with Zod and is prepared for future scheduler workers (Phase 5+).

### Delivery policy (JSONB)

`delivery_policy` field stores the selected delivery channels:

```json
{
  "channels": ["push", "email", "telegram"]
}
```

**Valid channels**:
- `"push"`: Expo Push Notifications
- `"email"`: Email via Resend
- `"telegram"`: Telegram Bot API

At least one channel must be selected (validated by schema).

This structure is used by future scheduler workers (Phase 5+) to determine which channels to attempt.

### Reminder query views

Query parameter `view` maps to different SQL filters:

#### View: `active`

All reminders with status `active` that are not snoozed and not overdue:

```sql
WHERE status = 'active'
  AND due_at >= now
  AND (snooze_until IS NULL OR snooze_until < now)
```

Shows near-future reminders (not yet overdue).

#### View: `today`

Reminders due today (midnight to 23:59:59 in user's timezone):

```sql
WHERE status = 'active'
  AND due_at >= start_of_today
  AND due_at <= end_of_today
```

Implementation in service:

```typescript
const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
q = q.gte('due_at', todayStart.toISOString())
     .lte('due_at', todayEnd.toISOString())
```

#### View: `upcoming`

Reminders with status `active` and due date in the future (> now):

```sql
WHERE status = 'active'
  AND due_at > now
```

#### View: `overdue`

Reminders with status `active`, due date in the past, and no active snooze:

```sql
WHERE status = 'active'
  AND due_at < now
  AND (snooze_until IS NULL OR snooze_until < now)
```

#### Default (no view)

If `view` param is absent, falls back to `status` filter if provided, or returns all non-archived reminders.

### Ownership and permission checks

All reminder operations verify user ownership:

```typescript
// Verify folder ownership before assignment
const { data: folder } = await supabase
  .from('folders')
  .select('id')
  .eq('id', input.folderId)
  .eq('user_id', userId)
  .single()

if (!folder) throw new Error('Folder not found or not owned by user')

// Verify theme ownership before assignment
const { data: ownedThemes } = await supabase
  .from('themes')
  .select('id')
  .in('id', input.themeIds)
  .eq('user_id', userId)

const ownedIds = (ownedThemes ?? []).map((t: { id: string }) => t.id)
```

This prevents users from assigning other users' folders or themes.

### Reminder themes join pattern

`reminder_themes` join handling mirrors `note_themes`:

```typescript
// On create: insert owned theme relationships
if (input.themeIds?.length) {
  const { data: ownedThemes } = await supabase
    .from('themes')
    .select('id')
    .in('id', input.themeIds)
    .eq('user_id', userId)

  const ownedIds = (ownedThemes ?? []).map((t: { id: string }) => t.id)
  if (ownedIds.length) {
    await supabase.from('reminder_themes').insert(
      ownedIds.map((tid: string) => ({ reminder_id: reminder.id, theme_id: tid }))
    )
  }
}

// On update: delete all old joins, insert new ones
if (input.themeIds !== undefined) {
  await supabase.from('reminder_themes').delete().eq('reminder_id', id)
  if (input.themeIds.length) {
    const { data: owned } = await supabase
      .from('themes')
      .select('id')
      .in('id', input.themeIds)
      .eq('user_id', userId)

    const ownedIds = (owned ?? []).map((t: { id: string }) => t.id)
    if (ownedIds.length) {
      await supabase.from('reminder_themes').insert(
        ownedIds.map((tid: string) => ({ reminder_id: id, theme_id: tid }))
      )
    }
  }
}
```

Themes are always fetched together with reminders via the `reminder_themes` join.

### Mobile state management for reminders

Reminders use Zustand for view state and crud operations.

#### Reminders store

```typescript
interface RemindersState {
  reminders: Reminder[]
  archivedReminders: Reminder[]
  activeView: ReminderView  // 'active' | 'today' | 'upcoming' | 'overdue'
  isLoading: boolean
  setView(view: ReminderView): void
  fetch(view?: ReminderView): Promise<void>
  fetchArchived(): Promise<void>
  create(input: CreateReminderInput): Promise<Reminder>
  update(id: string, input: UpdateReminderInput): Promise<void>
  remove(id: string): Promise<void>
  complete(id: string): Promise<void>
  snooze(id: string, snoozeUntil: string): Promise<void>
  cancel(id: string): Promise<void>
  restore(id: string): Promise<void>
}
```

#### View switching

```typescript
setView: (view) => {
  set({ activeView: view })
  get().fetch(view)  // Immediately fetch for selected view
}
```

When user taps a view tab (Active, Today, Upcoming, Overdue), the store:
1. Updates `activeView` state
2. Calls `fetch(view)` to refetch reminders for that view
3. UI re-renders with new data

#### Archived reminders

```typescript
fetchArchived: async () => {
  const archived = await remindersService.list({ status: 'completed' as never })
  set({ archivedReminders: archived })
}
```

Fetches reminders with status `completed` or `archived` on Archive screen open.

#### Complete/Cancel/Restore optimistic updates

```typescript
complete: async (id) => {
  await remindersService.complete(id)
  // Optimistically remove from active reminders
  set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) }))
}

cancel: async (id) => {
  await remindersService.cancel(id)
  // Optimistically remove from active reminders
  set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) }))
}

restore: async (id) => {
  const restored = await remindersService.restore(id)
  // Optimistically move from archived to active
  set((s) => ({
    archivedReminders: s.archivedReminders.filter((r) => r.id !== id),
    reminders: [restored, ...s.reminders],
  }))
}
```

These operations remove reminders from the current view immediately and update UI without waiting for next fetch.

#### Snooze updates

```typescript
snooze: async (id, snoozeUntil) => {
  const updated = await remindersService.snooze(id, snoozeUntil)
  set((s) => ({ reminders: s.reminders.map((r) => (r.id === id ? updated : r)) }))
}
```

Snooze keeps the reminder in active view but updates `snoozeUntil` field for UI display.

### Mobile services

Reminders service calls API endpoints with typed responses:

```typescript
export const remindersService = {
  list: (query?: Partial<ReminderQuery>) =>
    apiFetch<ApiResponse<Reminder[]>>(`/reminders${qs}`)
      .then((r) => r.data),

  get: (id: string) =>
    apiFetch<ApiResponse<Reminder>>(`/reminders/${id}`)
      .then((r) => r.data),

  create: (input: CreateReminderInput) =>
    apiFetch<ApiResponse<Reminder>>('/reminders', { method: 'POST', body: JSON.stringify(input) })
      .then((r) => r.data),

  update: (id: string, input: UpdateReminderInput) =>
    apiFetch<ApiResponse<Reminder>>(`/reminders/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
      .then((r) => r.data),

  delete: (id: string) =>
    apiFetch<void>(`/reminders/${id}`, { method: 'DELETE' }),

  complete: (id: string) =>
    apiFetch<ApiResponse<Reminder>>(`/reminders/${id}/complete`, { method: 'POST' })
      .then((r) => r.data),

  snooze: (id: string, snoozeUntil: string) =>
    apiFetch<ApiResponse<Reminder>>(`/reminders/${id}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ snoozeUntil })
    }).then((r) => r.data),

  cancel: (id: string) =>
    apiFetch<ApiResponse<Reminder>>(`/reminders/${id}/cancel`, { method: 'POST' })
      .then((r) => r.data),

  restore: (id: string) =>
    apiFetch<ApiResponse<Reminder>>(`/reminders/${id}/restore`, { method: 'POST' })
      .then((r) => r.data),
}
```

### Archive screen extension

Archive tab now displays both archived notes and completed/archived reminders.

#### Archive screen structure

```typescript
type FilterTab = 'all' | 'notes' | 'reminders'

const [filter, setFilter] = useState<FilterTab>('all')

// Fetch on mount
useEffect(() => {
  fetchArchivedNotes()
  fetchArchivedReminders()
}, [])

// Filter and merge
const noteItems = archivedNotes.filter(...).map(n => ({ ...n, itemType: 'note' as const }))
const reminderItems = archivedReminders.filter(...).map(r => ({ ...r, itemType: 'reminder' as const }))

const items =
  filter === 'notes' ? noteItems :
  filter === 'reminders' ? reminderItems :
  [...noteItems, ...reminderItems].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
```

#### Filter tabs

Archive shows three filter options:

| Tab | Shows | Source |
|-----|-------|--------|
| `all` | Archived notes + completed/archived reminders, sorted by updated_at desc | Both stores |
| `notes` | Archived notes only | Notes store |
| `reminders` | Completed/archived reminders only | Reminders store |

#### Items structure

Each item in archive list contains:
- `itemType`: `'note'` or `'reminder'` (for routing and render logic)
- `title`: Display text
- `updatedAt`: For sorting and date display
- Original item fields: `id`, `description`/`content_plain`, etc.

#### UI rendering

Archive list items show:
- Type badge: "NOTE" or "REMINDER" (different colors)
- Title
- Last updated date
- Restore button (available for both types)
- Optional: On note items, restore button is styled differently (accent color); on reminders, subdued

Tapping an item navigates to `/notes/{id}` or `/reminders/{id}` depending on type.

### Timezone handling

Each reminder stores a `timezone` field (IANA timezone string):

```typescript
timezone: "America/New_York"
```

In mobile create form:

```typescript
timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
```

This captures the device's local timezone at reminder creation time.

**Query implications**: When displaying `due_at` on mobile, it's interpreted in the stored `timezone`, not the device's current timezone. This ensures reminders due at "9 AM in New York" stay at 9 AM even if the user travels.

**Phase 5+ note**: Scheduler workers will use `timezone` to convert `due_at` to the correct local time for delivery.

### Repeat rule type safety

The `repeatRule` field is a discriminated union validated by Zod:

```typescript
export const repeatRuleSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal(RecurrenceType.None) }),
  z.object({
    type: z.literal(RecurrenceType.Daily),
    interval: z.number().int().min(1).default(1),
    endType: z.nativeEnum(RecurrenceEndType).default(RecurrenceEndType.Never),
    endCount: z.number().int().positive().nullable().optional(),
    endDate: z.string().nullable().optional()
  }),
  z.object({
    type: z.literal(RecurrenceType.Weekly),
    interval: z.number().int().min(1).default(1),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
    endType: z.nativeEnum(RecurrenceEndType).default(RecurrenceEndType.Never),
    endCount: z.number().int().positive().nullable().optional(),
    endDate: z.string().nullable().optional()
  }),
  // ... other types
])
```

This ensures:
- Type safety at compile time
- Server-side validation on create/update
- Mobile form can't submit invalid repeat rules
- Future scheduler can safely process rule without runtime checks

## Phase 5: Scheduled Delivery Infrastructure

Phase 5 implements the core reminder execution engine using BullMQ for job scheduling, Redis for delayed job storage, and PostgreSQL for persistent job metadata. The reminder system transitions from a stateless service to a real scheduled delivery pipeline.

### Queue Architecture

The system uses a single BullMQ queue for reminder delivery:

**Queue: `reminder-delivery`**

```typescript
interface ReminderDeliveryJobData {
  reminderId: string
  userId: string
  jobKey: string
  reminderJobId: string
  scheduledFor: string
}
```

- **Connection**: Redis (configured via `REDIS_URL`)
- **Job type**: `'deliver'`
- **Retry policy**: 3 attempts with exponential backoff (initial delay 5000ms)
- **Cleanup**: Successful jobs removed after 100 completed, failed jobs retained for 200 operations for debugging

The job key is deterministic: `${reminderId}:${scheduledFor}:v1`, enabling idempotency checks and preventing duplicate processing.

### Scheduler Service

Located at `apps/api/src/modules/scheduler/scheduler.service.ts`, the scheduler service manages the lifecycle of reminder jobs.

#### Core functions

**`scheduleReminderJob(opts)`**

Schedules a new delivery job for a reminder. Writes job metadata first, then enqueues the BullMQ job, then updates the job record with the BullMQ job ID.

```typescript
async function scheduleReminderJob(opts: {
  reminderId: string
  userId: string
  scheduledFor: Date
}): Promise<string>
```

Returns: Job record ID (for audit trail and updates)

Process:
1. Create `reminder_jobs` record with status `'scheduled'`
2. Add job to `reminder-delivery` queue with computed delay (0 if time is past)
3. Store the BullMQ job ID back to the job record
4. Log the schedule event

**`supersedePendingJobs(reminderId)`**

Invalidates all pending jobs for a reminder. Called before rescheduling due to edits or snoozes.

```typescript
async function supersedePendingJobs(reminderId: string): Promise<void>
```

Process:
1. Query all jobs with status `'scheduled'` for the reminder
2. Attempt to remove from BullMQ queue (may fail if already processing)
3. Mark job records as `'superseded'` in the database
4. Log supersession events

**`cancelPendingJobs(reminderId)`**

Terminal cancellation of pending jobs. Called when a reminder is completed or cancelled.

```typescript
async function cancelPendingJobs(reminderId: string): Promise<void>
```

Process:
1. Query all jobs with status `'scheduled'`
2. Remove from BullMQ queue (silently ignore if not found)
3. Mark job records as `'cancelled'`
4. Log cancellation

### Scheduling Lifecycle

The scheduler integrates with reminder state changes via the API layer. Here is the complete lifecycle:

**On Reminder Create**

1. API creates the reminder record with status `'active'`
2. API calls `scheduleReminderJob()` with the reminder's `due_at` time
3. Queue job is created and metadata persists in `reminder_jobs`
4. Worker will process the job at the scheduled time

**On Reminder Update** (edit timing or channels)

1. API updates the reminder record
2. API calls `supersedePendingJobs()` to invalidate old schedules
3. API calls `scheduleReminderJob()` with the new `due_at`
4. Old jobs are marked `'superseded'`, new job is enqueued

**On Snooze**

1. API updates `snooze_until` on the reminder
2. API calls `supersedePendingJobs()` to cancel current schedule
3. API calls `scheduleReminderJob()` with the snooze target time (usually `snooze_until`)
4. Old and new schedules coexist in the database; only the newest job will execute

**On Complete**

1. API updates reminder status to `'completed'` and sets `completed_at`
2. API calls `cancelPendingJobs()`
3. All pending jobs are marked `'cancelled'`
4. Worker checks will see the reminder is no longer `'active'` and skip delivery

**On Cancel**

1. API updates reminder status to `'cancelled'` and sets `cancelled_at`
2. API calls `cancelPendingJobs()`
3. Semantically equivalent to complete; prevents future delivery

**On Restore** (archived note restoration, not applicable to reminders)

N/A. Completed reminders do not restore.

### Worker Execution Flow

Located at `apps/api/src/workers/reminder.worker.ts`, workers process queued jobs with 4 mandatory pre-execution guard checks to prevent stale delivery.

**Worker Configuration**

```typescript
const worker = new Worker<ReminderDeliveryJobData>(
  'reminder-delivery',
  processJob,
  { connection: redis, concurrency: 5 }
)
```

- Concurrency: 5 jobs at a time
- Error handling: Logs failures and allows BullMQ to retry

**Processing Steps**

1. **Load reminder**: Query the reminder by ID and user ID
   - If not found or user mismatch: log warning, mark job as `'cancelled'`, skip

2. **Status check**: Verify reminder status is still `'active'`
   - If status is `'completed'`, `'cancelled'`, or other: mark job as `'superseded'`, skip
   - Prevents sending for already-handled reminders

3. **Job record check**: Query the job record from `reminder_jobs`
   - If status is not `'scheduled'` (e.g., already `'superseded'`, `'cancelled'`): skip
   - Prevents duplicate execution of rescheduled reminders

4. **Snooze check**: If `snooze_until` is set and past the job's `scheduled_for` time: mark job as `'superseded'`, skip
   - Prevents sending for reminders that were explicitly deferred

5. **Mark as processing**: Update job record status to `'processing'`

6. **Orchestrate delivery**: Call `orchestrateDelivery()` to send across all channels
   - If any channel fails, the error is re-thrown and BullMQ will retry

7. **Mark as completed**: Update job record status to `'completed'` after successful delivery
   - If an error occurs during orchestration, job record is updated with status `'failed'` and error message

### Delivery Orchestration

Located at `apps/api/src/modules/delivery/delivery.service.ts`, the delivery orchestrator handles multi-channel sends with strict idempotency.

**`orchestrateDelivery(ctx)`**

```typescript
interface DeliveryContext {
  reminder: Reminder
  reminderJobId: string
  jobKey: string
}

async function orchestrateDelivery(ctx: DeliveryContext): Promise<void>
```

**Process for each channel in `reminder.deliveryPolicy.channels`:**

1. **Compute idempotency key**: `${jobKey}:${channel}`
   - Example: `reminder-id:2026-03-12T15:00:00Z:v1:push`

2. **Check idempotency log**: Query `reminder_delivery_logs` for this key
   - If a log entry exists with status `'sent'`: skip this channel, continue to next
   - Prevents duplicate sends if the worker is retried

3. **Create or update delivery log**: Insert/upsert a log entry with status `'pending'`

4. **Send via provider**:
   - **Push**: Call `sendPushNotification()` with title and body
   - **Email**: Call `sendEmail()` with HTML body (email address resolved in Phase 6)
   - **Telegram**: Call `sendTelegramMessage()` with formatted message

5. **Record result**: Update the log entry with status `'sent'` or `'failed'`, provider response, and timestamp

6. **Re-throw on failure**: If any channel fails, the error is re-thrown so BullMQ retries the entire job
   - On retry, idempotency check prevents re-sending successful channels
   - Failed channels will be retried up to 3 times total

### Database Schema: `reminder_jobs`

Persistent metadata for every scheduled job. Enables audit trails and prevents queue-only state.

```sql
create table reminder_jobs (
  id uuid primary key,
  reminder_id uuid not null references reminders(id),
  user_id uuid not null references auth.users(id),
  job_type text not null default 'delivery',
  job_key text not null,                        -- ${reminderId}:${scheduledFor}:v1
  queue_name text not null default 'reminder-delivery',
  scheduled_for timestamptz not null,           -- when the job should execute
  status text not null default 'scheduled'
    check (status in (
      'scheduled',      -- queued, waiting to execute
      'processing',     -- worker claimed the job
      'completed',      -- delivery succeeded
      'cancelled',      -- reminder completed/cancelled before execution
      'failed',         -- delivery failed after retries
      'superseded'      -- rescheduled or snoozed; newer job exists
    )),
  bullmq_job_id text,                           -- reference to BullMQ job ID
  last_error text,                              -- if status is 'failed' or 'superseded', error reason
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

**Status machine:**

```
scheduled ──[worker claims]──> processing ──[success]──> completed
   ↓                              ↓
   └──[cancel/complete]──> cancelled         [failure/retry] ↓
   └──[snooze/edit]──────> superseded        [after max attempts] → failed
```

**Indexes:**
- `idx_reminder_jobs_reminder_id`: Fast lookup of all jobs for a reminder
- `idx_reminder_jobs_status` (partial): Fast lookup of `'scheduled'` jobs for queue recovery

**Row Level Security**: Users can only read/update their own job records.

### Database Schema: `reminder_delivery_logs`

Idempotency log for every channel delivery attempt. Prevents duplicate sends when workers retry.

```sql
create table reminder_delivery_logs (
  id uuid primary key,
  reminder_id uuid not null references reminders(id),
  reminder_job_id uuid references reminder_jobs(id),      -- null if orphaned
  user_id uuid not null references auth.users(id),
  channel text not null check (channel in ('push','email','telegram')),
  status text not null default 'pending'
    check (status in ('pending','sent','failed','skipped')),
  idempotency_key text not null unique,                   -- ${jobKey}:${channel}
  provider_response jsonb,                                 -- response from provider
  error_message text,
  attempted_at timestamptz not null default now()
)
```

**Idempotency guarantees:**

- The unique constraint on `idempotency_key` ensures only one log entry per (job, channel) pair
- Upsert logic allows the orchestrator to safely update the log on retry without error
- Worker checks the log before sending; if status is already `'sent'`, the channel is skipped
- This prevents the push/email/telegram providers from receiving duplicate requests even if the worker retries

**Indexes:**
- `idx_delivery_logs_reminder`: Fast lookup of all delivery attempts for a reminder
- `idx_delivery_logs_idem`: Fast lookup by idempotency key for deduplication

### Graceful Degradation

The scheduler and workers are resilient to infrastructure failures:

**Redis is unavailable:**
- `scheduleReminderJob()` will fail and throw an error
- The API layer catches this and responds with a graceful error (does not return 500)
- The reminder record is still created; scheduling is retried on next API call or user action
- No reminders will be sent until Redis is restored

**Worker crashes:**
- Jobs remain in Redis queue (persistent storage)
- When the worker restarts (see `apps/api/src/workers/index.ts`), it resumes processing queued jobs
- Execution is not lost; it is deferred until the worker is healthy

**Database is unavailable:**
- Job record writes fail; worker processing fails
- Errors are logged and jobs are retried by BullMQ
- Similar to Redis failure: system degrades gracefully

### Monitoring and Observability

The following events are logged with identifiable information:

```
[Scheduler] Scheduled job ${jobKey} for reminder ${reminderId} at ${scheduledFor}
[Scheduler] Superseded job ${jobId} for reminder ${reminderId}
[Scheduler] Cancelled all pending jobs for reminder ${reminderId}
[Worker] Processing job ${jobKey} for reminder ${reminderId}
[Worker] Reminder ${reminderId} is ${status} — skipping stale job ${jobKey}
[Worker] Job ${jobKey} completed successfully
[Worker] Job ${jobKey} failed: ${errMsg}
[Delivery] ${channel} → reminder ${id}: sent/failed
[Delivery] Skipping duplicate send for key ${idempotencyKey}
```

All logs include the reminder ID and job key, enabling correlation in log aggregators like Sentry or Datadog.

## Delivery Channel Integration (Phase 6)

Phase 6 introduces real-world delivery channels for reminders: push notifications, email, and Telegram. The delivery pipeline connects the scheduler/worker layer to external providers while maintaining idempotency and reliability.

### Delivery Channels

The TakeNotes app supports three delivery channels:

| Channel | Provider | Resolution | Activation |
|---------|----------|-----------|------------|
| **Push** | Expo Push Notifications | Device tokens registered via `/devices/register-push-token` | Automatic on app launch via `usePushNotifications` hook |
| **Email** | Resend | User email from `users.email` | Automatic on account creation |
| **Telegram** | Telegram Bot API | Chat ID from verified bot connection via `/integrations/telegram/connect` | Manual: User connects bot and verifies with token |

### Device Token Management

Device tokens for push notifications are managed by the mobile client.

**Registration flow:**

1. Mobile app requests Expo push permission via `usePushNotifications` hook
2. Expo returns a push token (format: `ExponentPushToken[...]`)
3. Mobile client calls `POST /devices/register-push-token` with platform, token, and app version
4. API upserts the token into `device_tokens` table, marking it active

**Deactivation flow:**

1. Mobile client explicitly calls `DELETE /devices/:id` (e.g., on logout or device reset)
2. API marks the token `is_active = false` without deleting the record
3. Delivery service ignores inactive tokens when sending

**Database schema:**

```sql
create table device_tokens (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  platform text not null check (platform in ('ios', 'android', 'web')),
  token text not null,
  app_version text,
  is_active boolean not null default true,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index idx_device_tokens_user_active on device_tokens(user_id, is_active);
```

### Telegram Connection Management

Telegram is different from push and email: it requires explicit user authorization via the Telegram bot.

**Connection flow:**

1. User calls `POST /integrations/telegram/connect` (authenticated)
2. API generates a unique `verification_token` and returns it
3. User's app displays instructions to send `/start <token>` to the Telegram bot
4. Bot receives the message and calls the webhook at `POST /integrations/telegram/webhook` (unauthenticated, secret-validated)
5. Webhook validates the secret header (`X-Telegram-Bot-Api-Secret-Token`) and updates the connection record with `telegram_user_id`, `chat_id`, and `is_verified = true`
6. User can now select Telegram as a delivery channel for reminders

**Key security properties:**

- The client **never** provides a `chat_id` directly; it is always captured from the Telegram bot callback
- The webhook validates a secret token header before processing any data
- The connection remains `is_verified = false` until the bot sends the verification message
- Verification tokens are unique and time-limited (implementation-dependent)

**Status check flow:**

1. User calls `GET /integrations/telegram/status` (authenticated)
2. API returns:
   - `isConnected: false` if no connection record exists
   - `isConnected: true, isVerified: false` if connection exists but not verified
   - `isConnected: true, isVerified: true, telegramUserId: "...", username: "..."` if fully verified

**Disconnect flow:**

1. User calls `POST /integrations/telegram/disconnect` (authenticated)
2. API deletes the `telegram_connections` record
3. Telegram can no longer be selected as a delivery channel

**Database schema:**

```sql
create table telegram_connections (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  telegram_user_id text,                  -- Telegram user ID (null until verified)
  chat_id text,                           -- Telegram chat ID (null until verified)
  username text,                          -- Telegram username (may be null)
  verification_token text unique,         -- One-time token for bot verification
  is_verified boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index idx_telegram_connections_user on telegram_connections(user_id);
create index idx_telegram_connections_token on telegram_connections(verification_token) where is_verified = false;
```

### Provider Implementations

Located at `apps/api/src/modules/{push,email,telegram}/`, each provider module handles sending to its external service.

#### Push Notifications (`push/push.provider.ts`)

Uses the Expo Push Notifications API to send batch notifications.

**`sendPushNotification(ctx)`:**

```typescript
interface PushContext {
  users: Array<{ id: string; email: string }>
  title: string
  body: string
}

async function sendPushNotification(ctx: PushContext): Promise<{
  sent: number
  failed: Array<{ token: string; error: string }>
}>
```

**Process:**

1. Query all active device tokens for the user(s)
2. Batch tokens into groups of 100 (Expo API limit)
3. Call Expo API: `POST https://exp.host/--/api/v2/push/send`
4. For each token result, log success or failure with error details
5. Return summary with count and failures

**Idempotency:** Expo handles idempotency via the `Idempotency-Key` header. This is set to the delivery log's `idempotency_key`.

#### Email (`email/email.provider.ts`)

Uses the Resend API to send transactional emails.

**`sendEmail(ctx)`:**

```typescript
interface EmailContext {
  to: string                              // user's email
  subject: string
  title: string
  body: string
  dueAt: Date
  timezone: string
}

async function sendEmail(ctx: EmailContext): Promise<{
  messageId: string
}>
```

**Process:**

1. Render an HTML email template with reminder details (title, body, due time in user's timezone)
2. Call Resend API: `POST https://api.resend.com/emails`
3. Return the provider's `message_id` (for `provider_message_id` in delivery logs)

**Template example:**

```html
<h2>${title}</h2>
<p>${body}</p>
<p>Due: ${dueAt} (${timezone})</p>
```

**Idempotency:** Resend doesn't have native idempotency, so the delivery service uses the `idempotency_key` to prevent duplicate inserts into `reminder_delivery_logs`.

#### Telegram (`telegram/telegram.provider.ts`)

Uses the Telegram Bot API to send messages via the user's verified chat.

**`sendTelegramMessage(ctx)`:**

```typescript
interface TelegramContext {
  chatId: string
  title: string
  body: string
  dueAt: Date
  timezone: string
}

async function sendTelegramMessage(ctx: TelegramContext): Promise<{
  messageId: number
}>
```

**Process:**

1. Format a text message: `*${title}*\n\n${body}\n\nDue: ${dueAt} (${timezone})`
2. Call Telegram Bot API: `POST https://api.telegram.org/bot{token}/sendMessage`
3. Return the provider's `message_id` (Telegram's message ID)

**Webhook handler (`telegram/channels.handler.ts`):**

Receives bot updates and processes verification. The webhook:

1. Validates the `X-Telegram-Bot-Api-Secret-Token` header matches `TELEGRAM_WEBHOOK_SECRET`
2. Extracts the verification token from the message text (format: `/start <token>`)
3. Finds the unverified `telegram_connections` record by token
4. Updates the record with `telegram_user_id`, `chat_id`, `username`, and `is_verified = true`

**Idempotency:** Message ID concatenation handles duplicate sends. Telegram deduplicates messages within a window.

### Delivery Service Integration

The `delivery.service.ts` orchestrator calls the appropriate provider for each channel in `reminder.deliveryPolicy.channels`.

**Flow for each channel:**

1. Compute idempotency key: `${jobKey}:${channel}`
2. Check delivery logs for this key; if `status = 'sent'`, skip (already sent successfully)
3. Create/update delivery log with `status = 'pending'`
4. Call the provider function (push, email, or telegram)
5. Update the log with `status = 'sent'`, `provider_message_id`, and `sent_at` timestamp
6. If any provider fails, re-throw so BullMQ retries the entire job (idempotency prevents re-sending successful channels)

**Example delivery log entry after a successful push and failed email:**

```
reminder_id: abc123
channel: push
status: sent
idempotency_key: abc123:2026-03-12T15:00:00Z:v1:push
provider_message_id: push-msg-456
sent_at: 2026-03-12T15:00:30Z

reminder_id: abc123
channel: email
status: failed
idempotency_key: abc123:2026-03-12T15:00:00Z:v1:email
error_message: "Provider rate limit exceeded"
attempted_at: 2026-03-12T15:00:31Z
```

### Environment Variables

Phase 6 requires these environment variables in `apps/api/.env`:

```
EXPO_ACCESS_TOKEN=<token-from-expo>            # For Expo Push API authentication
RESEND_API_KEY=<key-from-resend>               # For Resend email API
TELEGRAM_BOT_TOKEN=<token-from-botfather>      # Telegram Bot token
TELEGRAM_WEBHOOK_SECRET=<any-random-secret>    # Secret for validating webhook calls
APP_DEEP_LINK_BASE=<app-scheme>                # Deep link for mobile client (e.g., exp://...)
```

Optional fields can be left empty in development; the API will handle missing providers gracefully (skip channels, log warnings).

### Reliability and Monitoring

**Failure scenarios:**

- **Provider API is down**: BullMQ retries the job up to 3 times. Failed attempts are logged with error details.
- **User deletes device token**: Token is skipped; other channels proceed. Error is logged but not fatal.
- **User disconnects Telegram**: Chat ID is no longer available; Telegram channel is skipped. Error logged but not fatal.
- **Idempotency prevents duplicates**: If a worker retries due to a transient failure, successful channels are skipped on the second attempt (detected by idempotency key).

**Observability:**

All channel sends are logged with channel name, result, and error (if any):

```
[Delivery] push → reminder abc123: sent
[Delivery] email → reminder abc123: failed (Provider rate limit exceeded)
[Delivery] Skipping duplicate send for key abc123:2026-03-12T15:00:00Z:v1:push
```

Logs include reminder ID and message ID for correlation.

## Phase 7: Search, Filters, Smart Views, and Deep Linking

Phase 7 delivers product completeness with search and filtering across all content types, timezone-aware smart views, deep link routing for notifications, and comprehensive UI polish. The search system uses debouncing to minimize network requests, and views are computed server-side using timezone-aware boundary calculations.

### Search and Debouncing

Search inputs across Notes, Reminders, and Archive screens use a standard debounce pattern to prevent request spam during rapid typing.

#### Debounce Hook

Located at `apps/mobile/src/hooks/useDebounce.ts`:

```typescript
export const useDebounce = <T>(value: T, delay: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
```

- **Default delay**: 300ms (user-configurable)
- **Behavior**: Waits 300ms after the user stops typing before triggering a new search
- **Resets on input**: Each keystroke clears the timeout and restarts the countdown

#### Notes Search Pattern

In `app/(tabs)/notes.tsx`:

```typescript
const [searchInput, setSearchInput] = useState('')
const debouncedSearch = useDebounce(searchInput, 300)

useEffect(() => {
  notesStore.setQuery(debouncedSearch)
  notesStore.fetch()
}, [debouncedSearch])
```

User types in input → `searchInput` updates → `useDebounce` waits 300ms → `debouncedSearch` updates → `setQuery` triggers store update → `fetch()` calls API with `?q=...`.

#### Reminders and Archive

Same pattern applies:
- Reminders screen: Debounced search in `app/(tabs)/reminders.tsx` → `GET /reminders?q=...`
- Archive screen: Debounced search in `app/(tabs)/archive.tsx` → Filters archived notes/reminders locally after fetch

This prevents the API from receiving multiple requests during typing; only stable search terms are sent.

### Filter Chips and Sorting

#### Notes Screen (`app/(tabs)/notes.tsx`)

**Sort chips** (mutually exclusive):
- Updated (default)
- Created
- Title

**Filter chips** (horizontal ScrollView of themes):
- Display all user themes as horizontal chips
- Tapping a theme toggles it in the active filter set
- Notes matching all selected themes are shown
- Visual feedback: selected chips highlighted with theme color dot

**Empty states**:
- **Loading**: Skeleton placeholders while fetching
- **Dataset empty**: "No notes yet. Create one to get started" CTA
- **Filtered empty**: "No notes match your filters. Clear filters?" button
- **Error**: Retry button on network failure

#### Reminders Screen (`app/(tabs)/reminders.tsx`)

**Subtabs** (four views):
- Active (all status='active' reminders)
- Today (today in user's timezone)
- Upcoming (future due dates)
- Overdue (past due dates without active snooze)

Each tab has its own empty message:
- "No active reminders" (Active tab)
- "Nothing due today" (Today tab)
- "No upcoming reminders" (Upcoming tab)
- "No overdue reminders" (Overdue tab)

**Sort chips**:
- Due Date (earliest first)
- Updated (most recent first)

**Filter chips**:
- Folders: Horizontal row of folder filter chips
- Themes: Horizontal row of theme filter chips

**Filters are combined**: `status='active' AND folder_id IN (...) AND theme_id IN (...) AND search`

#### Archive Screen (`app/(tabs)/archive.tsx`)

**Date range filter** (dropdown):
- All time (no filter)
- Last 7 days
- Last 30 days

**Type filter** (buttons):
- All
- Notes
- Reminders

**Folder filter** (horizontal chips, for notes only):
- When "Notes" or "All" is selected, show folder filter chips
- When "Reminders" is selected, hide folder filter (reminders use themes)

**Empty states**:
- "No archived items" (if all empty)
- "No archived notes" (if notes tab is empty)
- "No archived reminders" (if reminders tab is empty)
- "No results match your filters. Adjust date range?"

### Timezone-Aware Smart Views

Reminders views are computed server-side using the user's timezone, ensuring "today" and "overdue" boundaries respect local midnight, not UTC.

#### getTodayBoundsInTz Helper

Located in `apps/api/src/modules/reminders/reminders.service.ts`:

```typescript
function getTodayBoundsInTz(timezone: string): { start: Date; end: Date } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  })

  const parts = formatter.formatToParts(new Date())
  const year = parseInt(parts.find((p) => p.type === 'year')!.value)
  const month = parseInt(parts.find((p) => p.type === 'month')!.value) - 1
  const day = parseInt(parts.find((p) => p.type === 'day')!.value)

  // Create midnight boundaries in UTC that correspond to 00:00 and 23:59:59 in the user's timezone
  const tzDate = new Date(year, month, day)
  const utcStart = new Date(tzDate.toLocaleString('en-US', { timeZone: timezone }))
  const utcEnd = new Date(utcStart)
  utcEnd.setHours(23, 59, 59, 999)

  return { start: utcStart, end: utcEnd }
}
```

This helper converts "today" in the user's local timezone to a UTC date range, accounting for timezone offset without relying on moment.js or complex calculations.

**Example**: If user is in America/New_York (UTC-5) and it is 2026-03-12 03:00 UTC:
- Local time in New York: 2026-03-11 22:00 (still yesterday)
- Today in New York: 2026-03-12 00:00 to 2026-03-12 23:59:59 EST

**Usage in API**:

```typescript
const timezone = query.timezone || user.timezone || 'UTC'
const { start, end } = getTodayBoundsInTz(timezone)

q = q.gte('due_at', start.toISOString())
     .lte('due_at', end.toISOString())
```

#### Mobile Timezone Forwarding

In `apps/mobile/src/services/reminders.service.ts`:

```typescript
const list = (query?: Partial<ReminderQuery>) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const params = new URLSearchParams({
    ...query,
    timezone,  // Send device timezone to API
  })
  return apiFetch<ApiResponse<Reminder[]>>(`/reminders?${params}`)
}
```

Mobile collects device timezone via `Intl.DateTimeFormat()` and passes it to all reminder list queries. API uses the provided timezone or falls back to user's stored timezone, then UTC.

#### Query Parameter Addition

`apps/api/src/modules/reminders/reminders.schema.ts` includes optional timezone:

```typescript
export const reminderQuerySchema = z.object({
  // ... existing filters
  timezone: z.string().optional(),  // IANA timezone like "America/New_York"
})
```

### Deep Link Routing

Reminders and push notifications can be opened directly via deep links. The mobile app supports both push notification deep links and manual URL scheme links.

#### Notification Response Listener

In `app/_layout.tsx`:

```typescript
useEffect(() => {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const reminderId = response.notification.request.content.data.reminderId as string
      if (reminderId) {
        router.push(`/reminders/${reminderId}`)
      }
    }
  )

  return () => subscription.remove()
}, [])
```

When a user taps a push notification, the app extracts the `reminderId` from the notification payload and navigates to the reminder detail screen.

#### URL Scheme Listener

Also in `app/_layout.tsx`:

```typescript
useEffect(() => {
  const handleLink = async (url: string) => {
    const parsed = url.replace(/.*?:\/\//g, '')
    const routeParts = parsed.split('/')

    if (routeParts[0] === 'reminders' && routeParts[1]) {
      const reminderId = routeParts[1]
      router.push(`/reminders/${reminderId}`)
    }
  }

  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleLink(url)
  })

  const initialUrl = await Linking.getInitialURL()
  if (initialUrl) {
    handleLink(initialUrl)
  }

  return () => subscription.remove()
}, [])
```

Supports both:
- **Cold start**: User taps a deep link before the app is launched → `getInitialURL()` captures the link
- **Warm start**: App is already running → `addEventListener` captures subsequent links

**URL format**: `takenotes://reminders/{reminderId}`

Example: `takenotes://reminders/550e8400-e29b-41d4-a716-446655440004`

#### Push Notification Payload

When the scheduler sends a push notification for a reminder, the payload includes the reminder ID:

```typescript
// In push.service.ts
const payload = {
  title: reminder.title,
  body: reminder.description || 'Time to take action',
  data: {
    reminderId: reminder.id,  // Used for deep linking
  },
}
```

### Organize Screen Enhancements

The Organize tab (`app/(tabs)/organize.tsx`) now supports creating folders and themes via FAB navigation.

#### Query Parameter Handling

FAB actions route with query params:
- `New Folder` → `/organize?createFolder=true`
- `New Theme` → `/organize?createTheme=true`

Screen detects params and auto-opens the correct modal:

```typescript
const { createFolder, createTheme } = useLocalSearchParams()

useEffect(() => {
  if (createFolder) {
    openFolderModal()
  }
  if (createTheme) {
    openThemeModal()
  }
}, [createFolder, createTheme])
```

#### Item Counts

Folders and themes now display combined counts:

```typescript
{
  id: '123',
  name: 'Work',
  itemCount: 5,  // 3 notes + 2 reminders
}
```

Computed on the backend during fetch:

```typescript
const countNotes = await supabase
  .from('notes')
  .select('id', { count: 'exact', head: true })
  .eq('folder_id', folderId)
  .eq('user_id', userId)

const countReminders = await supabase
  .from('reminders')
  .select('id', { count: 'exact', head: true })
  .eq('folder_id', folderId)
  .eq('user_id', userId)
  .eq('status', 'active')

folder.itemCount = (countNotes.count || 0) + (countReminders.count || 0)
```

#### Live Preview Panel

Create/edit folder and theme modals include a live preview showing the item in real time:

```typescript
const [name, setName] = useState('')
const [color, setColor] = useState('#6EA8FE')
const [icon, setIcon] = useState('folder')

return (
  <>
    <TextInput value={name} onChangeText={setName} />
    <ColorPicker value={color} onChange={setColor} />
    <IconPicker value={icon} onChange={setIcon} />

    {/* Live preview */}
    <View style={{ padding: 16, backgroundColor: theme.colors.bg.surface }}>
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color }} />
        <Icon name={icon} />
        <Text>{name || 'New Folder'}</Text>
      </View>
    </View>
  </>
)
```

As user types, selects color, and icon, preview updates in real time.

### FAB Completeness

The floating action button now routes to all four creation flows:

```typescript
// In app/(tabs)/_layout.tsx FAB menu
[
  { label: 'New Note', action: () => router.push('/notes/create') },
  { label: 'New Reminder', action: () => router.push('/reminders/create') },
  { label: 'New Folder', action: () => router.push('/organize?createFolder=true') },
  { label: 'New Theme', action: () => router.push('/organize?createTheme=true') },
]
```

All four actions now open implemented screens, not placeholders.

### Mobile State Management Updates

#### Notes Store

Added search query state:

```typescript
interface NotesState {
  query: string
  setQuery(q: string): void
  fetch(): Promise<void>
}
```

#### Reminders Store

Added view filtering and search:

```typescript
interface RemindersState {
  query: string
  folderId: string | null
  themeIds: string[]
  setQuery(q: string): void
  setFolderId(id: string | null): void
  toggleTheme(id: string): void
  // ... rest of state
}
```

### Empty State Architecture

All screens implement consistent empty state handling:

1. **Loading state**: Skeleton or shimmer while fetching
2. **Dataset empty**: Content type is empty (e.g., "No notes yet")
3. **Filtered empty**: Data exists but no items match current filters
4. **Error state**: Network or server error with retry button

This is determined by state flags:

```typescript
if (isLoading && notes.length === 0) {
  return <LoadingState />
} else if (notes.length === 0 && !hasAppliedFilters) {
  return <DatasetEmpty cta="Create note" />
} else if (notes.length === 0) {
  return <FilteredEmpty action={clearFilters} />
} else if (error) {
  return <ErrorState action={retry} />
} else {
  return <NotesList notes={notes} />
}
```

## Phase 8: Monitoring, Observability, and Release Readiness

Phase 8 delivers production-grade observability, security hardening, comprehensive testing, and release-ready tooling. The system is now fully instrumented for monitoring errors, performance, and operational health.

### Error Tracking with Sentry

All unhandled errors and exceptions are captured and reported to Sentry for visibility and alerting.

#### API Error Tracking

**Sentry initialization** (`apps/api/src/lib/sentry.ts`):

```typescript
import * as Sentry from "@sentry/node";

export const initSentry = () => {
  if (!process.env.SENTRY_DSN) {
    console.info("[Sentry] No DSN provided; running in no-op mode");
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    release: process.env.APP_VERSION || "unknown",
    tracesSampleRate: 1.0,
  });
};
```

**Global error handler** (`apps/api/src/server.ts`):

```typescript
fastifyServer.setErrorHandler(async (error, req, reply) => {
  logger.error({ err: error }, "Unhandled error");
  Sentry.captureException(error, {
    contexts: {
      http: {
        method: req.method,
        url: req.url,
        status_code: error.statusCode || 500,
      },
    },
  });

  // Return masked 5xx to client
  return reply.status(500).send({
    success: false,
    message: "Internal server error",
  });
});
```

**Worker exception capture** (`apps/api/src/workers/reminder.worker.ts`):

Each worker job that fails is reported with context:

```typescript
Sentry.captureException(error, {
  tags: {
    queue: "reminder-delivery",
  },
  contexts: {
    reminder: { reminder_id: job.data.reminder_id },
    job: { job_id: job.id, job_key: job.data.key },
  },
});
```

#### Mobile Error Tracking

**Sentry initialization** (`apps/mobile/src/lib/sentry.ts`):

```typescript
import * as Sentry from "sentry-expo";
import { Constants } from "expo-constants";

export const initSentry = () => {
  const dsn = Constants.expoConfig?.extra?.sentryDsn;
  if (!dsn) {
    console.info("[Sentry] No DSN provided; running in no-op mode");
    return;
  }

  Sentry.init({
    dsn,
    environment: __DEV__ ? "development" : "production",
    tracesSampleRate: 1.0,
  });
};
```

**Root initialization** (`apps/mobile/app/_layout.tsx`):

```typescript
import { initSentry } from "@/lib/sentry";

// Must be called at module level, before component tree
initSentry();

export default function RootLayout() {
  // ... layout code
}
```

**Expo configuration** (`apps/mobile/app.json`):

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.takenotes.app"
    },
    "android": {
      "package": "com.takenotes.app"
    },
    "extra": {
      "sentryDsn": "https://examplePublicKey@o0.ingest.sentry.io/0"
    },
    "plugins": ["sentry-expo/build/withSentry"]
  }
}
```

### Structured Logging

The API uses Pino for structured JSON logging with contextual fields.

#### Pino Logger Setup

**Logger configuration** (`apps/api/src/lib/logger.ts`):

```typescript
import pino from "pino";

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

export const logger = pinoLogger;
```

#### Contextual Logging with Child Loggers

Each subsystem creates a child logger with persistent context fields:

**Reminder worker logging** (`apps/api/src/workers/reminder.worker.ts`):

```typescript
const jobLogger = logger.child({
  reminder_id: job.data.reminder_id,
  job_id: job.id,
  job_key: job.data.key,
});

jobLogger.info("Processing reminder delivery job");
// All subsequent logs from jobLogger include these context fields
```

**Delivery service logging** (`apps/api/src/modules/delivery/service.ts`):

```typescript
const channelLogger = logger.child({
  reminder_id: reminder.id,
  channel_type: "email",
});

channelLogger.info("Sending email reminder");
if (error) {
  channelLogger.error({ err: error }, "Email delivery failed");
}
```

#### What Is and Is Not Logged

**Logged (safe to log)**:
- Reminder IDs, job IDs, operation names
- HTTP status codes, response times
- Channel delivery status (sent, failed, skipped)
- Database query durations and counts
- Worker queue stats

**NOT logged (secrets, tokens, PII)**:
- Email addresses
- Telegram chat IDs or usernames
- Expo push tokens
- API keys or secrets
- Supabase session tokens
- Passwords or authentication credentials
- User profile information (display names, descriptions)

This is enforced at the logger callsite — sensitive data is never formatted into log messages.

### Observability Checklist

**API observability:**
- ✓ All errors captured with context (reminder ID, job ID, channel type)
- ✓ Structured JSON logging with pino
- ✓ Sentry integration for alerting and issue tracking
- ✓ No secrets or PII in logs
- ✓ Delivery logs stored in `reminder_delivery_logs` table with idempotency keys
- ✓ Queue monitoring via BullMQ API and database queries

**Mobile observability:**
- ✓ Crashes and exceptions reported to Sentry
- ✓ Deep link navigation traced
- ✓ Auth state changes logged
- ✓ No tokens or user data in Sentry payload

**Deployment readiness:**
- ✓ Production environment validation (HTTPS Supabase, required secrets)
- ✓ EAS build profiles (development, preview, production)
- ✓ Health and readiness endpoints (`/health`, `/ready`)
- ✓ Graceful degradation when optional services are unavailable
- ✓ Worker retry logic and dead-letter handling
```
