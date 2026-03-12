# Phase_8.md

## Phase 8. QA, observability, release readiness, and hardening

## 1. Objective
Prepare the MVP for real use by hardening the system, improving observability, validating core flows, and ensuring the repository is maintainable and shippable.

This phase adds reliability and release readiness. It does not add new user-facing product scope.

---

## 2. Scope of this phase
This phase must include:
- test expansion for critical flows;
- error monitoring;
- structured logging refinement;
- performance and stability checks;
- release configuration;
- final documentation for setup and operations;
- security review of critical surfaces.

---

## 3. Testing requirements

### 3.1 Required test layers
The project must now have meaningful coverage in these areas:
- API integration tests;
- worker/scheduler tests;
- validation tests;
- critical mobile UI flow tests.

### 3.2 Critical flows that must be covered
At minimum:
- sign up / sign in / sign out;
- note create / edit / archive / restore;
- reminder create / complete / snooze / cancel;
- reminder scheduling and stale-job prevention;
- push token registration;
- Telegram connect flow;
- archive filters.

### 3.3 Regression focus
Tests must target the system’s riskiest logic:
- timezone handling;
- snooze rescheduling;
- duplicate delivery prevention;
- ownership boundaries;
- restore flows.

---

## 4. Observability requirements

### 4.1 Sentry
Instrument both mobile and API.

Capture at minimum:
- unhandled exceptions;
- API route failures;
- worker failures;
- provider send failures where useful.

### 4.2 Structured logs
API and workers must emit structured logs with fields that help trace failures.

At minimum include identifiers such as:
- `user_id` where safe;
- `reminder_id`;
- `job_id`;
- `channel_type`.

### 4.3 Log quality
Do not log secrets, raw passwords, tokens, or sensitive provider credentials.

---

## 5. Performance and resilience checks

### 5.1 Mobile
Validate:
- app launch does not crash on missing optional data;
- lists handle empty and moderate datasets cleanly;
- theme switching does not cause broken layouts.

### 5.2 API
Validate:
- API boots with validated config only;
- failed provider attempts do not crash the whole process;
- worker retries do not corrupt delivery history.

### 5.3 Queue system
Validate:
- queue worker restart behavior;
- stale job handling after app/API changes;
- persistent job metadata remains accurate.

---

## 6. Security hardening requirements
Review and confirm:
- RLS policies exist and are correct;
- authenticated routes reject unauthenticated access;
- cross-user resource access is blocked;
- Telegram binding cannot be spoofed from the client;
- device token registration is user-scoped;
- service role secrets are never exposed to the mobile client.

---

## 7. Release readiness requirements

### 7.1 Mobile
Prepare:
- production environment config;
- app identifiers;
- icons/splash placeholders if needed;
- EAS build configuration or equivalent.

### 7.2 API
Prepare:
- production start command;
- health/readiness endpoints confirmed;
- deploy documentation;
- env variable documentation.

### 7.3 Documentation
Create or update docs covering:
- local setup;
- required env variables;
- running tests;
- queue worker startup;
- Telegram bot webhook setup;
- push and email integration setup.

---

## 8. Final user-facing checks
Before this phase is complete, confirm these flows manually or through automated coverage:
- new user can sign up and use app;
- user can create note and reminder;
- reminder can be scheduled and delivered;
- reminder can be completed and archived;
- note can be archived and restored;
- light and dark themes both feel complete;
- Settings accurately reflects channel state.

---

## 9. Acceptance criteria
This phase is complete only if:
- critical flows are tested;
- Sentry is wired on mobile and API;
- logs are usable;
- security review items are addressed;
- deployment/release docs exist;
- the MVP can be handed off for real development or release candidate work without major architectural unknowns.

---

## 10. Tests required in this phase
This phase is itself test-focused. Expand the suite so that critical business flows are covered end-to-end as far as the stack allows.

---

## 11. What the agent must not do in this phase
- do not add new features instead of hardening;
- do not skip monitoring because the app “works locally”;
- do not leave deployment and env requirements undocumented;
- do not treat security verification as optional.
