# Phase_4.md

## Phase 4. Reminders domain, reminder UI, archive logic, snooze, and recurrence data model

## 1. Objective
Implement the second main product domain: Reminders. At the end of this phase, the user must be able to create, edit, browse, filter, snooze, complete, cancel, and archive reminders in the UI and data model.

This phase introduces the full reminder business object, but not the real delivery infrastructure yet.

---

## 2. Scope of this phase
This phase must include:
- reminder database schema;
- reminder API;
- reminder mobile screens and forms;
- reminder state transitions;
- archive integration for reminders;
- snooze data flow;
- recurrence data structure;
- overdue state computation strategy.

This phase must not include:
- actual queue workers;
- actual channel delivery;
- push/email/Telegram integration;
- real background sends.

---

## 3. Database requirements

### 3.1 `reminders`
Fields:
- `id`
- `user_id`
- `title`
- `description` nullable
- `folder_id` nullable
- `priority`
- `status`
- `due_at`
- `timezone`
- `repeat_rule` nullable
- `delivery_policy`
- `snooze_until` nullable
- `completed_at` nullable
- `cancelled_at` nullable
- `archived_at` nullable
- `created_at`
- `updated_at`

### 3.2 `reminder_themes`
Fields:
- `reminder_id`
- `theme_id`

### 3.3 Status values
Allowed only:
- `active`
- `completed`
- `overdue`
- `cancelled`
- `archived`

### 3.4 Priority values
Allowed only:
- `low`
- `medium`
- `high`
- `urgent`

### 3.5 `repeat_rule`
Store as structured JSON or normalized fields, but it must support:
- `type`
- `interval`
- `days_of_week`
- `end_type`
- `end_count`
- `end_date`

### 3.6 Indexing
At minimum index:
- `reminders(user_id, status, due_at)`
- `reminders(user_id, folder_id)`
- `reminders(user_id, updated_at desc)`

---

## 4. API requirements
Implement:
- `GET /reminders`
- `POST /reminders`
- `GET /reminders/:id`
- `PATCH /reminders/:id`
- `DELETE /reminders/:id`
- `POST /reminders/:id/complete`
- `POST /reminders/:id/snooze`
- `POST /reminders/:id/cancel`
- `POST /reminders/:id/restore`

### 4.1 `GET /reminders` query support
Support:
- status filter;
- folder filter;
- theme filter;
- date range filter;
- search query;
- sort by due date or updated date.

### 4.2 Completion behavior
`POST /reminders/:id/complete` must:
- set status to `completed`;
- set `completed_at`;
- make the reminder appear in Archive.

### 4.3 Snooze behavior
`POST /reminders/:id/snooze` must:
- require a target time or preset-derived time;
- set `snooze_until`;
- keep reminder active;
- prepare data for later scheduling integration.

### 4.4 Cancel behavior
`POST /reminders/:id/cancel` must:
- set status to `cancelled`;
- set `cancelled_at`.

### 4.5 Restore behavior
`POST /reminders/:id/restore` must restore a previously completed/cancelled/archived reminder back to `active` only when logically allowed.

---

## 5. Reminder UI requirements

### 5.1 Reminder list screen
Implement the real `Reminders` screen with internal view tabs:
- Active
- Today
- Upcoming
- Overdue

These may map to API query parameters and client-side view state.

### 5.2 Reminder card
Each card must show:
- title;
- due time;
- optional date;
- priority badge;
- folder chip if set;
- channel icons placeholder using the selected channel list;
- overflow actions;
- optional description preview.

### 5.3 Reminder create/edit screen
Required fields:
- title
- description
- due date
- due time
- timezone
- priority
- folder selector
- themes selector
- reminder channels multi-select
- repeat rule section

### 5.4 Reminder detail screen
Implement the detailed reminder screen according to `Design.md`.
Required sections:
- title;
- due date/time;
- repeat summary;
- action row: Complete / Snooze / Edit;
- channels display;
- description;
- destructive actions where appropriate.

### 5.5 Archive screen extension
Archive must now display both:
- archived notes;
- completed or archived reminders.

The `Archive` screen must support type filters:
- All
- Notes
- Reminders

---

## 6. Reminder channels in this phase
Actual delivery is not implemented yet, but the reminder form must already support selecting channels.

Allowed values:
- push
- email
- telegram

These must be stored in reminder data in a way that later phases can use directly.

---

## 7. Reminder user flows

### Flow A. Create reminder
1. User taps FAB.
2. User selects `New Reminder`.
3. User enters title.
4. User optionally enters description.
5. User sets due date and time.
6. User confirms timezone.
7. User selects one or more channels.
8. User optionally chooses folder and themes.
9. User optionally configures repeat.
10. User saves.
11. Reminder appears in `Active` or the relevant view.

### Flow B. Complete reminder
1. User opens reminder.
2. User taps `Complete`.
3. Reminder leaves active views.
4. Reminder appears in Archive.

### Flow C. Snooze reminder
1. User opens reminder.
2. User taps `Snooze`.
3. User chooses preset or custom time.
4. Reminder remains active.
5. New snooze time is displayed.

### Flow D. Cancel reminder
1. User opens reminder actions.
2. User taps `Cancel`.
3. Reminder status becomes cancelled.
4. Reminder is no longer shown as active.

### Flow E. Browse reminder views
1. User opens Reminders.
2. User switches between Active, Today, Upcoming, Overdue.
3. List updates correctly.

---

## 8. Overdue logic requirements
This phase must define and implement overdue logic at the data/query layer.

Rule:
- a reminder is overdue if `due_at` is in the past, status is still `active`, and there is no effective snooze that moves the next actionable time into the future.

The implementation may calculate overdue in queries or via explicit status updates, but the behavior must be correct and consistent.

---

## 9. Validation rules
- title required;
- due date/time required;
- priority required;
- at least one channel required;
- selected folder must belong to current user;
- selected themes must belong to current user;
- recurrence structure must validate by type;
- snooze time must be later than current time.

---

## 10. Acceptance criteria
This phase is complete only if:
- reminders CRUD works;
- reminder list views work;
- reminder detail screen exists;
- complete, snooze, cancel, restore flows work at the data/UI level;
- recurrence data can be created and edited;
- reminders appear in Archive when appropriate;
- overdue view is correct;
- all reminder UI works in both themes.

---

## 11. Tests required in this phase
Minimum required:
- API tests for reminder CRUD;
- API tests for complete/snooze/cancel state transitions;
- validation tests for recurrence payloads;
- UI test for reminder create flow;
- one test proving overdue query behavior is correct.

---

## 12. What the agent must not do in this phase
- do not use fake in-memory reminder state;
- do not postpone recurrence schema design;
- do not implement channel selection as pure UI without persisting it;
- do not fake Archive integration for reminders.
