# Phase_5.md

## Phase 5. Scheduler, queues, job persistence, and reminder execution infrastructure

## 1. Objective
Build the backend execution infrastructure that turns reminder records into scheduled work. At the end of this phase, the system must be able to translate reminder state changes into queued jobs, manage delayed execution, reschedule on snooze/edit, and persist delivery-related execution metadata.

Actual channel sends may still be mocked or stubbed behind providers if Phase 6 has not been completed yet, but the scheduling pipeline must be real.

---

## 2. Scope of this phase
This phase must include:
- BullMQ integration;
- Redis-backed delayed jobs;
- job producer logic;
- worker skeletons;
- persistent reminder job metadata in PostgreSQL;
- idempotency strategy;
- scheduling lifecycle for create/update/snooze/complete/cancel;
- overdue processing strategy if explicit jobs are used.

This phase must not include:
- final production channel sends if not yet implemented;
- analytics;
- release work.

---

## 3. Infrastructure requirements

### 3.1 Required queue architecture
Create a queue layer with at least these conceptual queues:
- `reminder-schedule`
- `reminder-delivery`
- optional `reminder-maintenance`

You may implement fewer physical queues if the architecture remains clear, but the code must clearly separate:
- scheduling decisions;
- delivery execution.

### 3.2 BullMQ usage
Use BullMQ delayed jobs for scheduled execution.
Do not use `setTimeout`, cron-only scheduling, or in-memory timers as the primary execution engine.

---

## 4. Persistent job metadata
Implement a `reminder_jobs` table.

### 4.1 Required fields
- `id`
- `reminder_id`
- `user_id`
- `job_type`
- `job_key`
- `queue_name`
- `scheduled_for`
- `status`
- `bullmq_job_id` nullable
- `last_error` nullable
- `created_at`
- `updated_at`

### 4.2 Allowed status values
At minimum:
- `scheduled`
- `processing`
- `completed`
- `cancelled`
- `failed`
- `superseded`

### 4.3 Purpose
This table is required to:
- audit scheduling behavior;
- support re-scheduling;
- avoid invisible queue state;
- make debugging possible.

---

## 5. Scheduling lifecycle rules

### 5.1 On reminder create
When a reminder is created:
- create the reminder record;
- compute its next execution time;
- create a queue job;
- write a `reminder_jobs` record.

### 5.2 On reminder update
When reminder timing or channels change:
- invalidate/supersede existing pending jobs;
- compute next execution time again;
- enqueue a new job;
- update `reminder_jobs` records accordingly.

### 5.3 On snooze
When a reminder is snoozed:
- mark previous pending job records as `superseded` or `cancelled`;
- create a new scheduled job for the snoozed target time;
- persist the new job.

### 5.4 On complete
When a reminder is completed:
- prevent future scheduled sends;
- cancel/supersede pending jobs;
- preserve history of previous job records.

### 5.5 On cancel
When a reminder is cancelled:
- cancel/supersede pending jobs;
- do not delete historical job records.

---

## 6. Worker requirements
Create worker processes in `apps/api/src/workers`.

### 6.1 Required responsibilities
Workers must:
- claim a queued job;
- verify the reminder still requires delivery;
- transition job metadata to processing;
- hand off to delivery orchestration;
- persist completion or failure status.

### 6.2 Re-check before execution
Before sending, the worker must re-check:
- reminder still exists;
- reminder belongs to valid user;
- reminder status is still actionable;
- reminder was not completed/cancelled/superseded;
- queued execution is still current.

This is mandatory to avoid stale delivery after edits or snooze.

---

## 7. Idempotency requirements
Reminder sending must be idempotent.

Required strategy:
- generate a deterministic execution key per reminder occurrence/channel attempt;
- store execution log records;
- avoid duplicate sends when workers retry.

The agent must not rely on “this probably won’t happen.” Duplicate delivery is a real failure mode.

---

## 8. Internal delivery orchestration contract
Define a delivery orchestration layer even if provider-specific sending is completed in Phase 6.

Suggested flow:
1. Worker loads reminder.
2. Worker resolves selected channels.
3. Orchestrator creates delivery attempt records.
4. Orchestrator calls channel providers.
5. Results are written back to delivery logs.

Channel providers must not be called directly from route handlers.

---

## 9. User flows in this phase
There are no new user-facing screens required here, but system behavior must now back the existing reminder UX.

### Flow A. Create reminder schedules real work
1. User creates reminder.
2. Backend writes reminder record.
3. Backend schedules queue job.
4. Job metadata exists in DB.

### Flow B. Snooze creates replacement schedule
1. User snoozes reminder.
2. Old pending schedule becomes superseded.
3. New schedule is created.
4. System is ready to deliver only the newest one.

### Flow C. Complete reminder cancels future work
1. User completes reminder.
2. Existing pending jobs are invalidated.
3. No future send occurs for the completed occurrence.

---

## 10. API/internal module structure requirements
At minimum create or complete these modules:
- `modules/scheduler`
- `modules/delivery`
- `queues`
- `workers`

Responsibilities must be separate.

Example separation:
- `scheduler` decides *when* work should run;
- `delivery` decides *how* it is sent;
- `workers` execute queued work.

---

## 11. Observability requirements for this phase
Add logs for:
- job creation;
- job cancellation/supersession;
- worker start;
- worker success;
- worker failure.

Logs must include identifiers that make debugging possible, such as reminder ID and job key.

---

## 12. Acceptance criteria
This phase is complete only if:
- reminder create/update/snooze/complete/cancel all affect scheduled jobs correctly;
- `reminder_jobs` table is real and populated;
- workers run through a real BullMQ pipeline;
- stale jobs are prevented from sending outdated reminders;
- queue logic survives process restarts because the schedule is Redis-backed and metadata is persisted.

---

## 13. Tests required in this phase
Minimum required:
- scheduling test on reminder creation;
- rescheduling test on reminder update;
- supersession test on snooze;
- cancellation test on completion;
- worker test proving stale jobs are ignored.

---

## 14. What the agent must not do in this phase
- do not use in-memory timers as the actual scheduler;
- do not skip persistent job metadata;
- do not send directly from API handlers;
- do not assume retries cannot duplicate sends.
