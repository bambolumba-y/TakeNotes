# API Reference

## Overview

The TakeNotes API is built with Fastify and provides RESTful endpoints for the mobile client. All endpoints use JSON for request/response bodies.

- **Base URL**: `http://localhost:3000` (development)
- **Authentication**: Supabase JWT tokens in `Authorization: Bearer <token>` header
- **Content-Type**: `application/json`

## Response Format

All successful responses follow this shape:

```json
{
  "success": true,
  "data": {}
}
```

All error responses follow this shape:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

## Authentication

### How it works

1. Client authenticates with Supabase Auth (email + password)
2. Supabase returns a JWT access token
3. Client includes token in all API requests: `Authorization: Bearer <token>`
4. API verifies token with Supabase and extracts user ID
5. API operations are scoped to the authenticated user

### Bearer token header

All authenticated endpoints require this header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

If missing or invalid, the API returns `401 Unauthorized`.

## Health Endpoints

### GET /health

Check if the API process is running.

**Authentication**: None

**Response**:

```json
{
  "status": "ok",
  "uptime": 12.345
}
```

- `status`: Always `"ok"` if the process is alive
- `uptime`: Process uptime in seconds

**Error codes**: None (will fail at TCP level if process is down)

**Example**:

```bash
curl http://localhost:3000/health
```

### GET /ready

Check if the API is ready to accept requests.

**Authentication**: None

**Response**:

```json
{
  "status": "ready"
}
```

- `status`: `"ready"` indicates the API is fully initialized

**Note**: In Phase 2, this only verifies environment config is loaded. Later phases will add database and Redis connectivity checks.

**Example**:

```bash
curl http://localhost:3000/ready
```

## User Endpoints

### GET /me

Retrieve the authenticated user's profile.

**Authentication**: Required

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "John Doe",
    "timezone": "America/New_York",
    "locale": "en-US",
    "appearanceMode": "system",
    "createdAt": "2026-03-12T10:30:00Z",
    "updatedAt": "2026-03-12T10:30:00Z"
  }
}
```

**Profile fields**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | User ID from Supabase Auth |
| `email` | string | User's email address |
| `displayName` | string \| null | User's display name (nullable on signup) |
| `timezone` | string | IANA timezone (e.g., `"America/New_York"`, defaults to `"UTC"`) |
| `locale` | string | BCP 47 locale code (e.g., `"en-US"`, defaults to device locale) |
| `appearanceMode` | `"system"` \| `"light"` \| `"dark"` | Theme preference |
| `createdAt` | ISO 8601 string | When the profile was created |
| `updatedAt` | ISO 8601 string | When the profile was last updated |

**Error responses**:

- `401 Unauthorized`: Missing or invalid token
- `500 Internal Server Error`: Profile lookup or creation failed

**Behavior**:

If the profile does not exist, it is automatically created with default values:
- `timezone` defaults to `"UTC"`
- `locale` defaults to `"en-US"`
- `appearanceMode` defaults to `"system"`
- `displayName` is `null` unless provided

**Example**:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/me
```

### PATCH /me

Update the authenticated user's profile.

**Authentication**: Required

**Request body**:

```json
{
  "displayName": "Jane Doe",
  "timezone": "Europe/London",
  "locale": "en-GB",
  "appearanceMode": "dark"
}
```

All fields are optional. Only provided fields are updated.

**Request field validation**:

| Field | Rules | Example |
|-------|-------|---------|
| `displayName` | 1–100 characters, optional | `"Jane Doe"` |
| `timezone` | Valid IANA timezone, 1–100 characters, optional | `"Europe/London"` |
| `locale` | 2–10 character BCP 47 code, optional | `"en-GB"` |
| `appearanceMode` | Must be `"system"`, `"light"`, or `"dark"`, optional | `"dark"` |

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "Jane Doe",
    "timezone": "Europe/London",
    "locale": "en-GB",
    "appearanceMode": "dark",
    "createdAt": "2026-03-12T10:30:00Z",
    "updatedAt": "2026-03-12T11:45:00Z"
  }
}
```

**Error responses**:

| Code | Status | Message |
|------|--------|---------|
| `VALIDATION_ERROR` | `400 Bad Request` | Invalid field values |
| `UNAUTHORIZED` | `401 Unauthorized` | Missing or invalid token |
| `INTERNAL_ERROR` | `500 Internal Server Error` | Database update failed |

**Example**:

```bash
curl -X PATCH \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Jane","appearanceMode":"dark"}' \
  http://localhost:3000/me
```

**Mobile client usage** (via `profile.service.ts`):

```typescript
// Fetch profile
const profile = await fetchProfile()

// Update profile
const updated = await updateProfile({
  displayName: "New Name",
  appearanceMode: ThemeMode.Dark
})
```

## Folder Endpoints

### GET /folders

Retrieve all folders for the authenticated user, sorted by creation date.

**Authentication**: Required

**Response**: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Work",
      "color": "#6EA8FE",
      "icon": "briefcase",
      "createdAt": "2026-03-12T10:30:00Z",
      "updatedAt": "2026-03-12T10:30:00Z"
    }
  ]
}
```

**Error responses**:
- `401 Unauthorized`: Missing or invalid token

**Example**:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/folders
```

### POST /folders

Create a new folder.

**Authentication**: Required

**Request body**:

```json
{
  "name": "Work",
  "color": "#6EA8FE",
  "icon": "briefcase"
}
```

**Request field validation**:

| Field | Rules |
|-------|-------|
| `name` | Required, 1–100 characters |
| `color` | Required, one of 8 palette colors |
| `icon` | Required, one of 20 icon names |

**Response**: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Work",
    "color": "#6EA8FE",
    "icon": "briefcase",
    "createdAt": "2026-03-12T10:30:00Z",
    "updatedAt": "2026-03-12T10:30:00Z"
  }
}
```

**Error responses**:
- `400 Bad Request`: Validation error (invalid color/icon or missing required fields)
- `401 Unauthorized`: Missing or invalid token

**Example**:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Work","color":"#6EA8FE","icon":"briefcase"}' \
  http://localhost:3000/folders
```

### PATCH /folders/:id

Update an existing folder.

**Authentication**: Required

**Path parameters**:
- `id`: Folder UUID

**Request body** (all fields optional):

```json
{
  "name": "Personal",
  "color": "#A78BFA",
  "icon": "star"
}
```

**Response**: `200 OK`

Returns the updated folder object (same shape as POST response).

**Error responses**:
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token

**Example**:

```bash
curl -X PATCH \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Personal"}' \
  http://localhost:3000/folders/550e8400-e29b-41d4-a716-446655440000
```

### DELETE /folders/:id

Delete a folder. Note: notes are not deleted; their `folder_id` is set to `null`.

**Authentication**: Required

**Path parameters**:
- `id`: Folder UUID

**Response**: `204 No Content`

**Error responses**:
- `401 Unauthorized`: Missing or invalid token

**Example**:

```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/folders/550e8400-e29b-41d4-a716-446655440000
```

## Theme Endpoints

### GET /themes

Retrieve all themes for the authenticated user, sorted by creation date.

**Authentication**: Required

**Response**: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "userId": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Urgent",
      "color": "#FB923C",
      "icon": "zap",
      "createdAt": "2026-03-12T10:30:00Z",
      "updatedAt": "2026-03-12T10:30:00Z"
    }
  ]
}
```

**Error responses**:
- `401 Unauthorized`: Missing or invalid token

**Example**:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/themes
```

### POST /themes

Create a new theme.

**Authentication**: Required

**Request body**:

```json
{
  "name": "Urgent",
  "color": "#FB923C",
  "icon": "zap"
}
```

**Request field validation**:

| Field | Rules |
|-------|-------|
| `name` | Required, 1–100 characters |
| `color` | Required, one of 8 palette colors |
| `icon` | Required, one of 20 icon names |

**Response**: `201 Created`

Same shape as GET response.

**Error responses**:
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token

**Example**:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Urgent","color":"#FB923C","icon":"zap"}' \
  http://localhost:3000/themes
```

### PATCH /themes/:id

Update an existing theme.

**Authentication**: Required

**Path parameters**:
- `id`: Theme UUID

**Request body** (all fields optional):

```json
{
  "name": "Critical",
  "color": "#F87171"
}
```

**Response**: `200 OK`

Returns the updated theme object.

**Error responses**:
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token

**Example**:

```bash
curl -X PATCH \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Critical"}' \
  http://localhost:3000/themes/550e8400-e29b-41d4-a716-446655440002
```

### DELETE /themes/:id

Delete a theme. Only the join records in `note_themes` are removed; content is not deleted.

**Authentication**: Required

**Path parameters**:
- `id`: Theme UUID

**Response**: `204 No Content`

**Error responses**:
- `401 Unauthorized`: Missing or invalid token

**Example**:

```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/themes/550e8400-e29b-41d4-a716-446655440002
```

## Note Endpoints

### GET /notes

Retrieve notes for the authenticated user with optional filtering and sorting.

**Authentication**: Required

**Query parameters** (all optional):

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `q` | string | Search query (title or plain content) | `?q=shopping` |
| `folderId` | UUID | Filter by folder ID | `?folderId=550e8400...` |
| `themeId` | UUID | Filter by theme ID | `?themeId=550e8400...` |
| `archived` | enum | Show archived notes only: `"true"` or `"false"` | `?archived=false` |
| `sort` | enum | Sort column: `"updated_at"`, `"created_at"`, or `"title"` | `?sort=updated_at` |
| `order` | enum | Sort direction: `"asc"` or `"desc"` | `?order=desc` |

**Default behavior**:
- `archived`: `"false"` (show active notes)
- `sort`: `"updated_at"` (most recently modified first)
- `order`: `"desc"`

**Response**: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "userId": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Project ideas",
      "content": "<p>Build a notes app</p>",
      "contentPlain": "Build a notes app",
      "folderId": "550e8400-e29b-41d4-a716-446655440000",
      "folder": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Work",
        "color": "#6EA8FE",
        "icon": "briefcase"
      },
      "themes": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440002",
          "name": "Urgent",
          "color": "#FB923C",
          "icon": "zap"
        }
      ],
      "isPinned": true,
      "isArchived": false,
      "createdAt": "2026-03-12T10:30:00Z",
      "updatedAt": "2026-03-12T11:45:00Z",
      "lastOpenedAt": "2026-03-12T12:00:00Z"
    }
  ]
}
```

**Error responses**:
- `401 Unauthorized`: Missing or invalid token

**Example**:

```bash
# Get all active notes
curl -H "Authorization: Bearer <token>" http://localhost:3000/notes

# Search for "shopping"
curl -H "Authorization: Bearer <token>" 'http://localhost:3000/notes?q=shopping'

# Filter by folder and sort by title
curl -H "Authorization: Bearer <token>" 'http://localhost:3000/notes?folderId=550e8400-e29b-41d4-a716-446655440000&sort=title&order=asc'

# Get archived notes
curl -H "Authorization: Bearer <token>" 'http://localhost:3000/notes?archived=true'
```

### POST /notes

Create a new note.

**Authentication**: Required

**Request body**:

```json
{
  "title": "Project ideas",
  "content": "<p>Build a notes app</p>",
  "folderId": "550e8400-e29b-41d4-a716-446655440000",
  "themeIds": ["550e8400-e29b-41d4-a716-446655440002"],
  "isPinned": false
}
```

**Request field validation**:

| Field | Rules |
|-------|-------|
| `title` | Required, 1–500 characters |
| `content` | Optional, defaults to empty string |
| `folderId` | Optional, must be owned by user |
| `themeIds` | Optional array of theme UUIDs, all must be owned by user |
| `isPinned` | Optional boolean, defaults to false |

**Response**: `201 Created`

Same shape as GET response item.

**Error responses**:
- `400 Bad Request`: Validation error or folder/theme not found
- `401 Unauthorized`: Missing or invalid token

**Example**:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Shopping list","content":"Milk, eggs, bread","folderId":"550e8400..."}' \
  http://localhost:3000/notes
```

### GET /notes/:id

Retrieve a single note by ID. Also updates `last_opened_at` timestamp.

**Authentication**: Required

**Path parameters**:
- `id`: Note UUID

**Response**: `200 OK`

Same shape as list item.

**Error responses**:
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Note not found or not owned by user

**Example**:

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/notes/550e8400-e29b-41d4-a716-446655440003
```

### PATCH /notes/:id

Update an existing note.

**Authentication**: Required

**Path parameters**:
- `id`: Note UUID

**Request body** (all fields optional):

```json
{
  "title": "Updated title",
  "content": "<p>New content</p>",
  "folderId": null,
  "themeIds": ["550e8400-e29b-41d4-a716-446655440002", "550e8400-..."],
  "isPinned": true
}
```

**Behavior**:
- If `themeIds` is provided, it replaces the entire theme assignment (not additive).
- If `folderId` is `null`, the note is unassigned from folder.

**Response**: `200 OK`

Returns the updated note object.

**Error responses**:
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Note not found

**Example**:

```bash
curl -X PATCH \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"isPinned":true}' \
  http://localhost:3000/notes/550e8400-e29b-41d4-a716-446655440003
```

### DELETE /notes/:id

Permanently delete a note.

**Authentication**: Required

**Path parameters**:
- `id`: Note UUID

**Response**: `204 No Content`

**Error responses**:
- `401 Unauthorized`: Missing or invalid token

**Example**:

```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/notes/550e8400-e29b-41d4-a716-446655440003
```

### POST /notes/:id/pin

Pin a note (move to pinned section).

**Authentication**: Required

**Path parameters**:
- `id`: Note UUID

**Request body**: None

**Response**: `200 OK`

Returns the updated note object with `isPinned: true`.

**Error responses**:
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Note not found

**Example**:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/notes/550e8400-e29b-41d4-a716-446655440003/pin
```

### POST /notes/:id/unpin

Unpin a note.

**Authentication**: Required

**Path parameters**:
- `id`: Note UUID

**Request body**: None

**Response**: `200 OK`

Returns the updated note object with `isPinned: false`.

**Error responses**:
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Note not found

**Example**:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/notes/550e8400-e29b-41d4-a716-446655440003/unpin
```

### POST /notes/:id/archive

Archive a note (hide from main view, appears in Archive tab).

**Authentication**: Required

**Path parameters**:
- `id`: Note UUID

**Request body**: None

**Response**: `200 OK`

Returns the updated note object with `isArchived: true` and `isPinned: false`.

**Behavior**:
- Archiving automatically unpins the note.

**Error responses**:
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Note not found

**Example**:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/notes/550e8400-e29b-41d4-a716-446655440003/archive
```

### POST /notes/:id/restore

Restore an archived note.

**Authentication**: Required

**Path parameters**:
- `id`: Note UUID

**Request body**: None

**Response**: `200 OK`

Returns the updated note object with `isArchived: false`.

**Error responses**:
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Note not found

**Example**:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/notes/550e8400-e29b-41d4-a716-446655440003/restore
```

## Reminder Endpoints

All reminder endpoints require authentication.

### GET /reminders

Retrieve reminders for the authenticated user with optional filtering and view selection.

**Authentication**: Required

**Query parameters** (all optional):

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `view` | enum | View preset: `"active"`, `"today"`, `"upcoming"`, or `"overdue"` | `?view=today` |
| `status` | enum | Filter by status: `"active"`, `"completed"`, `"overdue"`, `"cancelled"`, `"archived"` | `?status=active` |
| `folderId` | UUID | Filter by folder ID | `?folderId=550e8400...` |
| `themeId` | UUID | Filter by theme ID | `?themeId=550e8400...` |
| `q` | string | Search query (title or description) | `?q=meeting` |
| `timezone` | string | IANA timezone for "today" and "overdue" view boundaries | `?timezone=America/New_York` |
| `sort` | enum | Sort column: `"due_at"` or `"updated_at"` | `?sort=due_at` |
| `order` | enum | Sort direction: `"asc"` or `"desc"` | `?order=asc` |

**View behavior**:
- `"active"`: Status is `active`, snooze is not expired (or null)
- `"today"`: Status is `active`, due date falls within today (00:00–23:59:59 in user's timezone). Timezone boundary is computed on the server using the `timezone` query param, user's stored timezone, or UTC as fallback.
- `"upcoming"`: Status is `active`, due date is in the future
- `"overdue"`: Status is `active`, due date is in the past, snooze is not active (null or expired). Also computed using the `timezone` parameter.
- If no `view` specified, uses `status` filter; if neither specified, returns all non-archived reminders

**Timezone handling**:
The `timezone` parameter is optional. If provided, it must be a valid IANA timezone string (e.g., `"America/New_York"`, `"Europe/London"`, `"Asia/Tokyo"`). When `view=today` or `view=overdue` is used:
1. Server calculates the user's local midnight boundaries in the provided timezone
2. Reminders are filtered to those with `due_at` within that local day
3. If `timezone` is omitted, the API falls back to the user's stored timezone from their profile, then UTC
4. Mobile clients automatically include the device's timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`

**Default behavior**:
- `sort`: `"due_at"` (earliest due times first)
- `order`: `"asc"`

**Response**: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "userId": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Project kickoff",
      "description": "Discuss timeline and deliverables",
      "dueAt": "2026-03-13T14:00:00Z",
      "timezone": "America/New_York",
      "priority": "high",
      "status": "active",
      "folderId": "550e8400-e29b-41d4-a716-446655440000",
      "folder": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Work",
        "color": "#6EA8FE",
        "icon": "briefcase"
      },
      "themes": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440002",
          "name": "Urgent",
          "color": "#FB923C",
          "icon": "zap"
        }
      ],
      "deliveryPolicy": { "channels": ["push", "email"] },
      "repeatRule": { "type": "none" },
      "snoozeUntil": null,
      "completedAt": null,
      "cancelledAt": null,
      "archivedAt": null,
      "createdAt": "2026-03-12T10:30:00Z",
      "updatedAt": "2026-03-12T10:30:00Z"
    }
  ]
}
```

**Error responses**:
- `401 Unauthorized`: Missing or invalid token

**Example**:

```bash
# Get today's reminders (using server-stored timezone or UTC)
curl -H "Authorization: Bearer <token>" 'http://localhost:3000/reminders?view=today'

# Get today's reminders in a specific timezone
curl -H "Authorization: Bearer <token>" 'http://localhost:3000/reminders?view=today&timezone=America/New_York'

# Get overdue reminders in a timezone
curl -H "Authorization: Bearer <token>" 'http://localhost:3000/reminders?view=overdue&timezone=Europe/London'

# Search in a folder
curl -H "Authorization: Bearer <token>" 'http://localhost:3000/reminders?q=meeting&folderId=550e8400...'

# Sort by update time, descending
curl -H "Authorization: Bearer <token>" 'http://localhost:3000/reminders?sort=updated_at&order=desc'

# Combine filters and timezone
curl -H "Authorization: Bearer <token>" 'http://localhost:3000/reminders?view=today&timezone=Asia/Tokyo&q=meeting'
```

### POST /reminders

Create a new reminder.

**Authentication**: Required

**Request body**:

```json
{
  "title": "Project kickoff",
  "description": "Discuss timeline and deliverables",
  "dueAt": "2026-03-13T14:00:00Z",
  "timezone": "America/New_York",
  "priority": "high",
  "folderId": "550e8400-e29b-41d4-a716-446655440000",
  "themeIds": ["550e8400-e29b-41d4-a716-446655440002"],
  "deliveryPolicy": { "channels": ["push", "email"] },
  "repeatRule": { "type": "daily", "interval": 1, "endType": "never" }
}
```

**Request field validation**:

| Field | Rules |
|-------|-------|
| `title` | Required, 1–500 characters |
| `description` | Optional string |
| `dueAt` | Required, ISO 8601 datetime string, must be valid |
| `timezone` | Required, valid IANA timezone string (e.g., `"America/New_York"`) |
| `priority` | Required, one of: `"low"`, `"medium"`, `"high"`, `"urgent"` |
| `folderId` | Optional UUID, must be owned by user if provided |
| `themeIds` | Optional array of theme UUIDs, all must be owned by user |
| `deliveryPolicy` | Required, `{ "channels": [array of channel strings] }` |
| `channels` in delivery policy | Required array with at least one of: `"push"`, `"email"`, `"telegram"` |
| `repeatRule` | Optional recurrence configuration (see below) |

**Repeat rule structure** (discriminated union by `type`):

```typescript
// None (default)
{ "type": "none" }

// Daily
{ "type": "daily", "interval": 1, "endType": "never" | "after_count" | "on_date", "endCount"?: number, "endDate"?: ISO8601 }

// Weekly
{ "type": "weekly", "interval": 1, "daysOfWeek": [0-6], "endType": "never" | "after_count" | "on_date", "endCount"?: number, "endDate"?: ISO8601 }

// Monthly
{ "type": "monthly", "interval": 1, "endType": "never" | "after_count" | "on_date", "endCount"?: number, "endDate"?: ISO8601 }

// Yearly
{ "type": "yearly", "interval": 1, "endType": "never" | "after_count" | "on_date", "endCount"?: number, "endDate"?: ISO8601 }

// Custom
{ "type": "custom", "interval": number, "daysOfWeek"?: [0-6], "endType": "never" | "after_count" | "on_date", "endCount"?: number, "endDate"?: ISO8601 }
```

- `daysOfWeek` values: `0` = Sunday, `6` = Saturday
- `endCount` for `"after_count"`: positive integer
- `endDate` for `"on_date"`: ISO 8601 date string

**Response**: `201 Created`

Same shape as GET response item.

**Error responses**:
- `400 Bad Request`: Validation error (missing fields, invalid values, folder/theme not owned)
- `401 Unauthorized`: Missing or invalid token

**Example**:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Project kickoff",
    "description":"Discuss timeline",
    "dueAt":"2026-03-13T14:00:00Z",
    "timezone":"America/New_York",
    "priority":"high",
    "deliveryPolicy":{"channels":["push","email"]},
    "repeatRule":{"type":"none"}
  }' \
  http://localhost:3000/reminders
```

### GET /reminders/:id

Retrieve a single reminder by ID.

**Authentication**: Required

**Path parameters**:
- `id`: Reminder UUID

**Response**: `200 OK`

Same shape as list item.

**Error responses**:
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Reminder not found or not owned by user

**Example**:

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/reminders/550e8400-e29b-41d4-a716-446655440004
```

### PATCH /reminders/:id

Update an existing reminder.

**Authentication**: Required

**Path parameters**:
- `id`: Reminder UUID

**Request body** (all fields optional):

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "dueAt": "2026-03-14T09:00:00Z",
  "timezone": "Europe/London",
  "priority": "medium",
  "folderId": null,
  "themeIds": ["550e8400-..."],
  "deliveryPolicy": { "channels": ["email", "telegram"] },
  "repeatRule": { "type": "weekly", "interval": 2, "daysOfWeek": [1, 3, 5], "endType": "never" }
}
```

**Behavior**:
- If `themeIds` is provided, it replaces the entire theme assignment (not additive).
- If `folderId` is `null`, the reminder is unassigned from folder.
- Cannot update status through PATCH; use dedicated action endpoints.

**Response**: `200 OK`

Returns the updated reminder object.

**Error responses**:
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Reminder not found

**Example**:

```bash
curl -X PATCH \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"priority":"medium","deliveryPolicy":{"channels":["push"]}}' \
  http://localhost:3000/reminders/550e8400-e29b-41d4-a716-446655440004
```

### DELETE /reminders/:id

Permanently delete a reminder.

**Authentication**: Required

**Path parameters**:
- `id`: Reminder UUID

**Request body**: None

**Response**: `204 No Content`

**Error responses**:
- `401 Unauthorized`: Missing or invalid token

**Example**:

```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/reminders/550e8400-e29b-41d4-a716-446655440004
```

### POST /reminders/:id/complete

Mark a reminder as completed. Sets status to `completed` and records `completed_at` timestamp. Reminder is no longer active and appears in Archive.

**Authentication**: Required

**Path parameters**:
- `id`: Reminder UUID

**Request body**: None

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "status": "completed",
    "completedAt": "2026-03-13T09:15:00Z",
    ...rest of reminder object
  }
}
```

**Status changes**:
- `status`: `active` → `completed`
- `completed_at`: Set to current ISO 8601 timestamp
- Other state: Preserved as-is

**Visibility**:
- Reminder disappears from active/today/upcoming/overdue views
- Reminder appears in Archive tab (via `GET /reminders?view=archived` or by fetching archived reminders)

**Error responses**:
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Reminder not found

**Example**:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/reminders/550e8400-e29b-41d4-a716-446655440004/complete
```

### POST /reminders/:id/snooze

Snooze a reminder to a future time. Keeps reminder active but delays its next actionable time.

**Authentication**: Required

**Path parameters**:
- `id`: Reminder UUID

**Request body**:

```json
{
  "snoozeUntil": "2026-03-13T15:00:00Z"
}
```

**Request field validation**:

| Field | Rules |
|-------|-------|
| `snoozeUntil` | Required, ISO 8601 datetime string, must be in the future (> now) |

**Validation errors**:
- If `snoozeUntil` is in the past or equal to current time, returns `400 Bad Request` with code `INVALID_SNOOZE`.

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "status": "active",
    "snoozeUntil": "2026-03-13T15:00:00Z",
    ...rest of reminder object
  }
}
```

**State changes**:
- `snooze_until`: Set to provided datetime
- `status`: Remains `active`
- Other state: Preserved as-is

**Visibility effect**:
- Reminder remains in "active" view until snooze expires
- When querying with `view=active`, a snoozed reminder is excluded if `snooze_until > now`
- When snooze expires (snooze_until becomes past), reminder re-enters active views

**Error responses**:
- `400 Bad Request`: Validation error (invalid datetime, past time)
- `400 Bad Request` with code `INVALID_SNOOZE`: Snooze time is not in the future
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Reminder not found

**Example**:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"snoozeUntil":"2026-03-13T15:30:00Z"}' \
  http://localhost:3000/reminders/550e8400-e29b-41d4-a716-446655440004/snooze
```

### POST /reminders/:id/cancel

Cancel a reminder. Sets status to `cancelled` and records `cancelled_at` timestamp. Reminder is no longer active.

**Authentication**: Required

**Path parameters**:
- `id`: Reminder UUID

**Request body**: None

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "status": "cancelled",
    "cancelledAt": "2026-03-13T09:20:00Z",
    ...rest of reminder object
  }
}
```

**State changes**:
- `status`: `active` (or any active state) → `cancelled`
- `cancelled_at`: Set to current ISO 8601 timestamp
- Other state: Preserved as-is

**Visibility**:
- Reminder disappears from all active views
- Reminder is restorable via `POST /reminders/:id/restore`

**Error responses**:
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Reminder not found

**Example**:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/reminders/550e8400-e29b-41d4-a716-446655440004/cancel
```

### POST /reminders/:id/restore

Restore a previously completed, cancelled, or archived reminder back to active state.

**Authentication**: Required

**Path parameters**:
- `id`: Reminder UUID

**Request body**: None

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "status": "active",
    "completedAt": null,
    "cancelledAt": null,
    "archivedAt": null,
    "snoozeUntil": null,
    ...rest of reminder object
  }
}
```

**Restoration rules**:
- Can only restore from status: `completed`, `cancelled`, or `archived`
- Cannot restore from `active` (error)
- Restoration clears: `completed_at`, `cancelled_at`, `archived_at`, `snooze_until`
- Sets `status` to `active`

**Visibility**:
- Restored reminder appears in active/today/upcoming views depending on due_at
- Reminder no longer appears in Archive

**Error responses**:
- `400 Bad Request` with code `INVALID_RESTORE`: Reminder cannot be restored from current status (e.g., already active)
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Reminder not found

**Example**:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/reminders/550e8400-e29b-41d4-a716-446655440004/restore
```

## Device Token Endpoints

### POST /devices/register-push-token

Register or update a device token for push notifications.

**Authentication**: Required

**Request body**:

```json
{
  "platform": "ios",
  "token": "ExponentPushToken[...]",
  "appVersion": "1.0.0"
}
```

**Request field validation**:

| Field | Rules |
|-------|-------|
| `platform` | Required, one of: `"ios"`, `"android"`, `"web"` |
| `token` | Required, non-empty string (Expo push token) |
| `appVersion` | Optional, semantic version string |

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440005",
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "platform": "ios",
    "token": "ExponentPushToken[...]",
    "appVersion": "1.0.0",
    "isActive": true,
    "createdAt": "2026-03-12T10:30:00Z",
    "updatedAt": "2026-03-12T10:30:00Z"
  }
}
```

**Behavior**:

- If a device token with the same platform and token already exists, it is updated (upsert) and marked `isActive: true`
- Old tokens for the same platform are not automatically deactivated; the client should explicitly deactivate stale tokens

**Error responses**:

- `400 Bad Request`: Invalid platform or missing required fields
- `401 Unauthorized`: Missing or invalid token

**Example**:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"platform":"ios","token":"ExponentPushToken[abcdef123456]","appVersion":"1.0.0"}' \
  http://localhost:3000/devices/register-push-token
```

### DELETE /devices/:id

Deactivate a device token. The token record is not deleted; it is marked `isActive: false`.

**Authentication**: Required

**Path parameters**:

- `id`: Device token UUID

**Response**: `204 No Content`

**Error responses**:

- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Device token not found or not owned by user

**Example**:

```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/devices/550e8400-e29b-41d4-a716-446655440005
```

## Telegram Integration Endpoints

### POST /integrations/telegram/connect

Initiate Telegram connection. Returns a verification token that the user sends to the Telegram bot. The bot webhook will verify the token and complete the connection.

**Authentication**: Required

**Request body**: None

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "verificationToken": "verify_abc123def456",
    "botUsername": "@TakeNotesBot",
    "instructions": "Send /start verify_abc123def456 to the bot to complete connection"
  }
}
```

**Behavior**:

- Creates a `telegram_connections` record with `is_verified: false` and a unique `verification_token`
- The user must send the token to the Telegram bot within a time limit (e.g., 15 minutes)
- The bot webhook verifies the token and sets `is_verified: true`, capturing `telegram_user_id`, `chat_id`, and optionally `username`

**Error responses**:

- `401 Unauthorized`: Missing or invalid token

**Example**:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/integrations/telegram/connect
```

### GET /integrations/telegram/status

Retrieve the current Telegram connection status for the authenticated user.

**Authentication**: Required

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "isConnected": true,
    "isVerified": true,
    "telegramUserId": "123456789",
    "username": "john_doe",
    "connectedAt": "2026-03-12T11:00:00Z"
  }
}
```

If no connection exists:

```json
{
  "success": true,
  "data": {
    "isConnected": false,
    "isVerified": false
  }
}
```

**Response field meanings**:

| Field | Presence | Meaning |
|-------|----------|---------|
| `isConnected` | Always | Whether a Telegram connection record exists |
| `isVerified` | Always | Whether the connection has been verified via bot webhook |
| `telegramUserId` | If verified | Telegram user ID from the bot update |
| `username` | If verified | Telegram username (may be null) |
| `connectedAt` | If verified | ISO 8601 timestamp of connection |

**Error responses**:

- `401 Unauthorized`: Missing or invalid token

**Example**:

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/integrations/telegram/status
```

### POST /integrations/telegram/disconnect

Disconnect Telegram. Removes the Telegram connection record; Telegram can no longer be used as a delivery channel for reminders.

**Authentication**: Required

**Request body**: None

**Response**: `204 No Content`

**Error responses**:

- `401 Unauthorized`: Missing or invalid token

**Example**:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/integrations/telegram/disconnect
```

### POST /integrations/telegram/webhook

Receive and process Telegram bot webhook updates. This endpoint is called by Telegram's servers when the bot receives a message.

**Authentication**: None (validated by secret header)

**Header validation**:

```
X-Telegram-Bot-Api-Secret-Token: <secret-token>
```

This header must match `TELEGRAM_WEBHOOK_SECRET` environment variable. If missing or invalid, the request is rejected with `401 Unauthorized`.

**Request body** (Telegram Update object):

```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 1,
    "date": 1615624800,
    "chat": { "id": 987654321, "type": "private" },
    "from": { "id": 987654321, "is_bot": false, "first_name": "John" },
    "text": "/start verify_abc123def456"
  }
}
```

**Processing**:

1. Validates the secret token header
2. Extracts the verification token from message text (expects format `/start <token>`)
3. Finds the pending `telegram_connections` record by `verification_token`
4. Updates the record with `telegram_user_id`, `chat_id`, `username`, and sets `is_verified: true`
5. Returns `200 OK` immediately (fire-and-forget processing)

**Response**: `200 OK`

```json
{
  "success": true,
  "data": { "processed": true }
}
```

**Error responses**:

- `401 Unauthorized`: Invalid or missing secret token header
- `400 Bad Request`: Malformed Telegram update or invalid token format
- `404 Not Found`: Verification token not found (may have expired)

**Security notes**:

- The secret token is validated before any processing
- The endpoint does not require user authentication; instead, it validates the request came from Telegram's servers
- Idempotency: If the same update arrives twice, the second update will also set `is_verified: true` (idempotent)
- No client ever provides a `chat_id` directly; it is always captured from the Telegram bot callback

**Example** (from Telegram's servers):

```bash
curl -X POST \
  -H "X-Telegram-Bot-Api-Secret-Token: your-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "update_id":123456789,
    "message":{
      "message_id":1,
      "date":1615624800,
      "chat":{"id":987654321,"type":"private"},
      "from":{"id":987654321,"is_bot":false,"first_name":"John"},
      "text":"/start verify_abc123def456"
    }
  }' \
  http://your-api-domain.com/integrations/telegram/webhook
```

## Future Endpoints

The following routes are scaffolded and will be implemented in later phases:

- **Scheduler**: Queue workers and delivery execution (internal)

## Error Handling

### HTTP Status Codes

- `200 OK`: Successful request
- `400 Bad Request`: Validation error (malformed body, invalid fields)
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Resource not found (future)
- `500 Internal Server Error`: Server-side error

### Error response shape

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

### Common error codes

| Code | Cause | Resolution |
|------|-------|-----------|
| `UNAUTHORIZED` | Missing/invalid/expired token | Sign in again to get a fresh token |
| `VALIDATION_ERROR` | Invalid request body | Check field types and constraints |
| `NOT_FOUND` | Resource doesn't exist | Verify the resource ID |
| `INTERNAL_ERROR` | Server-side issue | Retry or contact support |

## Mobile client integration

The mobile client communicates with the API through `src/lib/api.ts`:

```typescript
// Authenticated fetch
const response = await apiFetch<ApiResponse<UserProfile>>('/me')

// With options
const response = await apiFetch<ApiResponse<UserProfile>>('/me', {
  method: 'PATCH',
  body: JSON.stringify({ displayName: 'New Name' })
})
```

The `apiFetch` function:
1. Automatically attaches Supabase JWT token from session
2. Sets `Content-Type: application/json`
3. Throws on HTTP error
4. Returns typed response

## Type safety

All endpoints are typed through the `@takenotes/shared` package:

```typescript
// Shared types
import type { UserProfile, UpdateProfileInput } from '@takenotes/shared'
import { updateProfileSchema } from '@takenotes/shared'

// Mobile client
const profile: UserProfile = await fetchProfile()

// API server
const input: UpdateProfileInput = request.body
const result = updateMeSchema.safeParse(input)
```

This ensures mobile and API stay in sync.

## Development notes

### Testing endpoints

Use `curl` to test endpoints manually:

```bash
# Health check (no auth needed)
curl http://localhost:3000/health

# Get profile (auth required)
curl -H "Authorization: Bearer <token>" http://localhost:3000/me

# Update profile
curl -X PATCH \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Test"}' \
  http://localhost:3000/me
```

### Getting a test token

1. Sign up through the mobile app
2. Check browser dev tools or Supabase dashboard for the session token
3. Or extract from Expo logs when testing

### Adding new endpoints

1. Create a new module folder in `apps/api/src/modules/`
2. Implement `{module}.route.ts`, `{module}.handler.ts`, `{module}.service.ts`
3. Register route in `apps/api/src/server.ts`
4. Export types and schemas from `packages/shared`
5. Add mobile client service in `apps/mobile/src/services/`

See the users module for the pattern.
