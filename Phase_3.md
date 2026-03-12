# Phase_3.md

## Phase 3. Core data model, folders, themes, and full Notes feature

## 1. Objective
Implement the first complete product domain: Folders, Themes, and Notes. At the end of this phase, the user must be able to manage folders and themes, create and edit notes, assign folders and themes to notes, pin notes, archive notes, and browse/search/filter notes.

This phase is the first real end-user feature phase.

---

## 2. Scope of this phase
This phase must include:
- database tables for folders, themes, notes, note-theme relationships;
- real API endpoints for folders, themes, and notes;
- real mobile screens and forms for these features;
- notes list, note detail/editor, and archive support for notes;
- search/filter/sort for notes;
- basic `Organize` functionality for folders and themes.

This phase must not include:
- reminders domain;
- reminder scheduling;
- delivery channels;
- reminder archive behavior.

---

## 3. Database requirements
Implement the following tables with proper ownership and timestamps.

### 3.1 `folders`
Fields:
- `id`
- `user_id`
- `name`
- `color`
- `icon`
- `created_at`
- `updated_at`

Rules:
- `(user_id, name)` should be unique enough for user clarity if desired, but if exact duplicates are allowed, the UI must still behave predictably;
- deleting a folder must not delete related notes.

### 3.2 `themes`
Fields:
- `id`
- `user_id`
- `name`
- `color`
- `icon`
- `created_at`
- `updated_at`

### 3.3 `notes`
Fields:
- `id`
- `user_id`
- `title`
- `content`
- `content_plain`
- `folder_id` nullable
- `is_pinned`
- `is_archived`
- `color_override` nullable
- `icon_override` nullable
- `created_at`
- `updated_at`
- `last_opened_at` nullable

### 3.4 `note_themes`
Fields:
- `note_id`
- `theme_id`

Primary rule:
- the relationship table must prevent duplicate `(note_id, theme_id)` pairs.

### 3.5 Indexing
At minimum index:
- `notes(user_id, updated_at desc)`
- `notes(user_id, is_archived)`
- `notes(user_id, folder_id)`
- `folders(user_id)`
- `themes(user_id)`

---

## 4. API requirements

### 4.1 Folder endpoints
Implement:
- `GET /folders`
- `POST /folders`
- `PATCH /folders/:id`
- `DELETE /folders/:id`

Behavior:
- all endpoints are authenticated;
- all operations are scoped to current user;
- deleting a folder must null out `folder_id` in affected notes.

### 4.2 Theme endpoints
Implement:
- `GET /themes`
- `POST /themes`
- `PATCH /themes/:id`
- `DELETE /themes/:id`

Behavior:
- deleting a theme removes only join records.

### 4.3 Note endpoints
Implement:
- `GET /notes`
- `POST /notes`
- `GET /notes/:id`
- `PATCH /notes/:id`
- `DELETE /notes/:id`
- `POST /notes/:id/pin`
- `POST /notes/:id/archive`
- `POST /notes/:id/restore`

### 4.4 Query behavior for `GET /notes`
Support:
- search query;
- folder filter;
- theme filter;
- archived filter;
- sort by `updated_at`, `created_at`, `title`.

Do not leave these behaviors client-only. The server must support them.

---

## 5. Mobile UI requirements

### 5.1 Notes list screen
Implement the real `Notes` screen according to `Design.md`.

Required sections:
- header;
- search bar;
- horizontal folder strip;
- pinned notes block;
- recent notes list.

### 5.2 Note editor screen
Implement a real note create/edit screen.

Required fields:
- title
- content
- folder selector
- themes selector
- pin toggle

Behavior:
- create and edit use the same form shell where practical;
- unsaved changes must be handled predictably;
- content may be plain multiline text in MVP.

### 5.3 Organize screen
Implement Folders and Themes management in the `Organize` tab.

Required actions for folders and themes:
- create;
- edit;
- delete.

### 5.4 Archive integration for notes
Archived notes must appear in `Archive` after the archive feature for notes is introduced here.
The `Archive` screen may still contain only notes at this stage.

---

## 6. User flows in this phase

### Flow A. Create folder
1. User opens `Organize`.
2. User chooses `Folders`.
3. User taps create.
4. User enters name.
5. User selects color.
6. User selects icon.
7. User saves.
8. Folder appears in folder lists and selectors.

### Flow B. Create theme
1. User opens `Organize`.
2. User chooses `Themes`.
3. User taps create.
4. User enters name.
5. User selects color.
6. User selects icon.
7. User saves.
8. Theme appears in theme lists and selectors.

### Flow C. Create note
1. User taps FAB.
2. User selects `New Note`.
3. User enters title and content.
4. User optionally selects a folder.
5. User optionally selects themes.
6. User saves.
7. Note appears in `Notes`.

### Flow D. Pin note
1. User opens a note or uses note actions.
2. User enables pin.
3. Note appears in `Pinned` section.

### Flow E. Archive note
1. User opens note actions.
2. User archives the note.
3. Note disappears from active notes list.
4. Note appears in `Archive`.

### Flow F. Restore archived note
1. User opens `Archive`.
2. User selects note item.
3. User taps `Restore`.
4. Note returns to active Notes list.

### Flow G. Filter notes
1. User opens `Notes`.
2. User uses search and/or folder filter and/or theme filter.
3. Notes list updates to matching result set.

---

## 7. Validation and business rules

### 7.1 Folder validation
- name required;
- name length constrained;
- color must be from allowed palette;
- icon must be from allowed icon set.

### 7.2 Theme validation
Same rules as folder.

### 7.3 Note validation
- title required;
- content may be empty only if title is present;
- referenced folder must belong to current user;
- referenced themes must belong to current user.

### 7.4 Ownership
The API must never allow cross-user folder/theme assignment.

---

## 8. Search and filtering requirements
For this phase, search can be implemented as simple case-insensitive DB search.
No advanced full-text engine is required yet.

The following must work:
- search title;
- search content;
- filter by folder;
- filter by one or more themes;
- filter archived vs active;
- sort results.

---

## 9. Acceptance criteria
This phase is complete only if:
- folders CRUD works;
- themes CRUD works;
- notes CRUD works;
- note pinning works;
- note archive and restore work;
- Notes screen matches the documented structure;
- Organize screen is functional;
- Archive can display archived notes;
- search/filter/sort for notes works;
- all new UI works in both light and dark themes.

---

## 10. Tests required in this phase
Minimum required:
- API integration tests for notes CRUD;
- API tests for folder deletion nulling `folder_id`;
- API tests for theme deletion removing join rows only;
- client tests or equivalent coverage for note creation and archive flow;
- one query/filter test covering search + folder filter combination.

---

## 11. What the agent must not do in this phase
- do not build reminders yet;
- do not merge note and reminder models into one generic content item model;
- do not skip the archive behavior for notes;
- do not allow arbitrary free-form colors or icons for folders/themes.
