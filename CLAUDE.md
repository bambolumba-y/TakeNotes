# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 1. Purpose of this document
This file is the master instruction contract for the coding agent. The agent must treat this repository as a strictly specified implementation project, not as an exploratory product design exercise.

The agent must not invent features, remove required behaviors, rename core entities, change navigation, redesign screens, or replace architectural decisions unless the user explicitly asks for that change.

If something is not fully specified, the agent must choose the most conservative implementation that preserves:
- the fixed data model;
- the fixed user flows;
- the fixed navigation model;
- the fixed light/dark theme system;
- the fixed backend scheduling approach.

This document is the source of truth for product scope and architecture. `Design.md` is the source of truth for UI. Each `Phase_N.md` file is the source of truth for implementation order and detailed execution.

---

## 2. Product definition
Project name: **TakeNotes**.

Product type: **mobile-first personal notes and reminders app**.

The product must support two separate content domains:
- **Notes**: free-form information records with no execution lifecycle.
- **Reminders**: actionable items with due time, delivery channels, state transitions, completion, snooze, repeat rules, and archive history.

The app is for personal organization. It is **not** a team collaboration tool, not a chat app, not a document editor, not a shared workspace, and not a calendar replacement.

---

## 3. Fixed information architecture
The bottom tab bar must contain exactly these tabs:
1. `Notes`
2. `Reminders`
3. `Archive`
4. `Organize`
5. `Settings`

A floating action button must exist globally and open a create menu with exactly these actions:
- `New Note`
- `New Reminder`
- `New Folder`
- `New Theme`

The app must not replace this structure with a dashboard-first home screen, hamburger-only navigation, or a single mixed content feed.

Internal subtabs are allowed where explicitly specified, for example inside `Reminders`.

---

## 4. Mandatory feature set

### 4.1 Notes
A note is a free-form record.

Required capabilities:
- create note;
- read note;
- edit note;
- delete note;
- pin note;
- archive note manually;
- assign zero or one folder;
- assign zero or many themes;
- search by title and content;
- filter by folder and themes;
- sort by updated date, created date, and title.

### 4.2 Reminders
A reminder is a separate domain entity with due time and delivery logic.

Required capabilities:
- create reminder;
- edit reminder;
- delete reminder;
- set title;
- set optional description;
- set due date and time;
- use user timezone;
- select one or many delivery channels;
- set priority;
- configure recurrence;
- snooze reminder;
- complete reminder;
- cancel reminder;
- show overdue reminders;
- automatically expose completed reminders in Archive;
- search by title and description;
- filter by status, folder, theme, and date.

### 4.3 Archive
Archive is a history section, not a trash can.

Required capabilities:
- display completed reminders;
- display archived notes;
- search archived items;
- filter by item type;
- restore archived notes;
- permanently delete archived items;
- display completed/archived date metadata.

### 4.4 Organize
The `Organize` section must include management for:
- `Folders`
- `Themes`

#### Folders
A folder is a single-container organizational entity.

Required fields:
- `name`
- `color`
- `icon`

Rules:
- a folder belongs to one user;
- a note can belong to zero or one folder;
- a reminder can belong to zero or one folder;
- deleting a folder must not delete notes or reminders;
- when a folder is deleted, related `folder_id` values must become `null`.

#### Themes
A theme is a user-facing label entity. Technically it may be implemented as a tag model, but UI wording must remain `Theme`.

Required fields:
- `name`
- `color`
- `icon`

Rules:
- a note can have zero or many themes;
- a reminder can have zero or many themes;
- deleting a theme must only remove the relationship records, not content.

### 4.5 Reminder delivery channels
The product must support exactly these reminder delivery channels:
- `push`
- `email`
- `telegram`

The target architecture must include all three channels from the start, even if the implementation is staged.

---

## 5. Fixed user flows

### Flow A. Create note
1. User taps the global FAB.
2. User selects `New Note`.
3. User enters title.
4. User enters content.
5. User optionally selects a folder.
6. User optionally selects one or more themes.
7. User saves.
8. The note appears in `Notes`.

### Flow B. Create reminder
1. User taps the global FAB.
2. User selects `New Reminder`.
3. User enters title.
4. User optionally enters description.
5. User sets date and time.
6. User sees timezone and may adjust it if the UI allows.
7. User selects one or more delivery channels.
8. User optionally selects a folder.
9. User optionally selects themes.
10. User optionally configures recurrence.
11. User saves.
12. The reminder appears in `Reminders > Active`.
13. Backend creates the corresponding scheduled job.

### Flow C. Complete reminder
1. User opens a reminder or uses a quick action.
2. User taps `Complete`.
3. Reminder status becomes `completed`.
4. `completed_at` is stored.
5. The reminder disappears from active reminder views.
6. The reminder appears in `Archive`.

### Flow D. Snooze reminder
1. User opens a reminder.
2. User taps `Snooze`.
3. User selects a preset or custom time.
4. Backend invalidates the previous scheduled delivery job.
5. Backend creates a new job for the snoozed time.
6. Reminder remains active.

### Flow E. Connect Telegram
1. User opens `Settings > Notification Channels > Telegram`.
2. User taps `Connect Telegram`.
3. App displays a deep link or verification token.
4. User opens the Telegram bot.
5. User sends the start payload.
6. Backend binds Telegram chat to the current `user_id`.
7. Telegram becomes available as a reminder channel.

### Flow F. Restore archived note
1. User opens `Archive`.
2. User filters `Notes` or keeps `All`.
3. User opens an archived note or uses a quick action.
4. User taps `Restore`.
5. `is_archived` becomes `false`.
6. The note returns to `Notes`.

---

## 6. Fixed technical stack

### Frontend
Required:
- React Native
- Expo
- TypeScript
- Expo Router
- Zustand
- TanStack Query
- React Hook Form
- Zod

### Backend
Required:
- Node.js
- TypeScript
- Fastify
- Supabase Auth
- PostgreSQL via Supabase
- Redis
- BullMQ

### External integrations
Required:
- Expo Push Notifications
- Resend
- Telegram Bot API

### Tooling
Required:
- ESLint
- Prettier
- TypeScript strict mode
- Sentry

The agent must not replace this stack with Flutter, Firebase-only architecture, native iOS/Android, or a no-backend client-only implementation.

---

## 7. Fixed repository structure
The project must use a monorepo.

```text
root/
  apps/
    mobile/
    api/
  packages/
    shared/
  infra/
  docs/
  package.json
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json
```

### `apps/mobile`
```text
apps/mobile/
  app/
  src/
    components/
    features/
      auth/
      notes/
      reminders/
      archive/
      organize/
      settings/
    hooks/
    lib/
    services/
    store/
    theme/
    types/
```

### `apps/api`
```text
apps/api/
  src/
    config/
    db/
    lib/
    modules/
      auth/
      users/
      notes/
      reminders/
      archive/
      folders/
      themes/
      devices/
      channels/
      scheduler/
      delivery/
      email/
      push/
      telegram/
    queues/
    workers/
    types/
```

### `packages/shared`
```text
packages/shared/
  src/
    constants/
    enums/
    schemas/
    types/
    contracts/
```

The agent must not collapse all logic into a single folder tree.

---

## 8. Fixed domain model
The following domain entities are mandatory:
- `users`
- `notes`
- `reminders`
- `folders`
- `themes`
- `note_themes`
- `reminder_themes`
- `device_tokens`
- `telegram_connections`
- `reminder_delivery_logs`
- `reminder_jobs`

### Reminder statuses
The allowed status values are fixed:
- `active`
- `completed`
- `overdue`
- `cancelled`
- `archived`

Rules:
- new reminders start as `active`;
- completed reminders must appear in Archive;
- overdue reminders remain visible in reminder views until completed/cancelled or archived by explicit rule;
- cancelled reminders are not deleted automatically.

### Reminder priorities
Allowed values:
- `low`
- `medium`
- `high`
- `urgent`

### Reminder recurrence
Allowed top-level values:
- `none`
- `daily`
- `weekly`
- `monthly`
- `yearly`
- `custom`

For `custom`, the data model must support:
- `interval`
- `days_of_week`
- `end_type` = `never | after_count | on_date`

---

## 9. Backend architecture rules
The reminder system must be built as a scheduled delivery system, not as a purely request-time feature.

Required backend components:
- API service for CRUD and settings;
- queue producer logic when reminders are created/updated/completed/snoozed;
- BullMQ workers for delivery execution;
- Redis-backed delayed jobs;
- persistent job metadata in PostgreSQL;
- delivery logs for every channel attempt;
- idempotent send logic.

The agent must not build scheduling logic that depends only on in-memory timers.

---

## 10. Security rules
Required:
- Supabase Row Level Security;
- ownership checks by `user_id` everywhere;
- no client-side trust for archive/complete/cancel operations;
- secrets stored in server environment only;
- validation of all request bodies with Zod;
- strict separation between authenticated and unauthenticated routes;
- server-side verification for Telegram binding;
- safe token handling for push registration.

---

## 11. Fixed UI rules
All UI implementation must follow `Design.md`.

Non-negotiable rules:
- support both light and dark themes from the beginning;
- use a shared token system;
- do not hardcode colors directly inside screens;
- Notes and Reminders are separate sections;
- FAB is global;
- Archive is separate;
- Organize is separate;
- Settings contains appearance and channel management.

---

## 12. Non-goals for MVP
The following are explicitly out of scope unless the user later requests them:
- collaboration;
- shared folders;
- comments;
- file attachments;
- whiteboard/canvas;
- voice notes;
- AI features;
- external calendar sync;
- location-based reminders;
- desktop-first support;
- web app as primary deliverable.

The agent must not partially implement these features “for future use” if doing so changes the current architecture.

---

## 13. Coding rules for the agent
The agent must:
- prefer small typed modules over monolithic files;
- keep DTOs and schemas explicit;
- share enums and contracts through `packages/shared`;
- keep UI components presentation-focused;
- keep domain logic out of view code;
- keep delivery logic out of route handlers;
- avoid TODO placeholders in critical flows;
- write code that can run, not pseudo-code.

The agent must not:
- invent alternative entity names;
- mix note and reminder logic into a shared generic item model in the UI if it reduces clarity;
- skip edge-case handling for timezones, snooze, or archive;
- leave theme implementation half-finished.

---

## 14. Definition of done
A phase is done only when all of the following are true:
- all required user flows in that phase are implemented;
- data is validated;
- API and client types match;
- empty states and error states exist;
- light and dark themes both work for new UI in that phase;
- tests required by the phase are present;
- no critical behavior is mocked if that phase requires real behavior.

---

## 15. Execution order
The development order is fixed and defined by these files:
- `Phase_1.md`
- `Phase_2.md`
- `Phase_3.md`
- `Phase_4.md`
- `Phase_5.md`
- `Phase_6.md`
- `Phase_7.md`
- `Phase_8.md`

The agent must not jump ahead and implement a later phase before the current dependency layer is complete.

---

## 16. Final rule
The agent must treat this repository as a precise engineering implementation project. When in doubt, preserve the documented domain model, documented user flows, documented navigation, and documented design system.
