# Phase_6.md

## Phase 6. Delivery channel integrations: Push, Email, Telegram, and delivery logs

## 1. Objective
Implement all three reminder delivery channels and their supporting user/account infrastructure. At the end of this phase, reminders must be deliverable through push notifications, email, and Telegram according to the selected channels on each reminder.

This phase connects the previously built scheduler to real outbound delivery providers.

---

## 2. Scope of this phase
This phase must include:
- push notification provider integration;
- email provider integration;
- Telegram bot integration;
- device token registration;
- Telegram account connection flow;
- delivery log persistence;
- failure handling and retries at the provider boundary;
- channel state UI in Settings.

---

## 3. Database requirements

### 3.1 `device_tokens`
Fields:
- `id`
- `user_id`
- `platform`
- `token`
- `app_version`
- `is_active`
- `created_at`
- `updated_at`

Rules:
- allow multiple device tokens per user;
- deactivate token on logout or explicit invalidation if possible.

### 3.2 `telegram_connections`
Fields:
- `id`
- `user_id`
- `telegram_user_id`
- `chat_id`
- `username` nullable
- `is_verified`
- `created_at`
- `updated_at`

### 3.3 `reminder_delivery_logs`
Fields:
- `id`
- `reminder_id`
- `job_id` nullable
- `channel_type`
- `status`
- `provider_message_id` nullable
- `error_message` nullable
- `sent_at` nullable
- `created_at`

Allowed statuses:
- `queued`
- `sent`
- `delivered`
- `failed`

---

## 4. Push integration requirements
Use Expo Push Notifications.

### 4.1 Mobile requirements
Implement:
- permission request flow;
- device token acquisition;
- device token registration with API;
- token refresh handling where applicable.

### 4.2 API requirements
Implement:
- `POST /devices/register-push-token`
- `DELETE /devices/:id` or equivalent deactivation flow

### 4.3 Delivery behavior
When a reminder uses the `push` channel:
- worker resolves active device tokens for the user;
- worker sends a notification payload through the push provider;
- every attempt is logged.

### 4.4 Push content
Push notification must contain:
- reminder title;
- optional short body;
- deep link target to reminder detail.

---

## 5. Email integration requirements
Use Resend.

### 5.1 Email provider module
Implement a dedicated email provider module.
Do not send email from random helper code.

### 5.2 Email content
Reminder email must include:
- title;
- due time;
- optional description excerpt;
- action link or deep link target to the app if available.

### 5.3 Delivery behavior
When a reminder uses the `email` channel:
- worker creates a delivery log record;
- provider send is executed;
- send result is written back to log.

---

## 6. Telegram integration requirements
Use Telegram Bot API.

### 6.1 Connection flow
Required user flow:
1. User opens `Settings > Notification Channels > Telegram`.
2. User taps `Connect Telegram`.
3. API creates a short-lived connection token or deep link payload.
4. App shows instructions and opens bot link if user chooses.
5. User sends `/start <payload>` to bot.
6. Backend verifies payload and links the chat to current user.
7. Telegram connection state updates in the app.

### 6.2 Required API routes
Implement:
- `POST /integrations/telegram/connect`
- `POST /integrations/telegram/disconnect` or equivalent
- webhook route for bot updates

### 6.3 Security rule
Telegram connection must not trust any arbitrary chat ID sent from the mobile client. The binding must happen only after a verified bot interaction.

### 6.4 Delivery behavior
When a reminder uses the `telegram` channel:
- worker resolves verified Telegram chat for the user;
- worker sends the reminder message;
- result is logged.

---

## 7. Settings UI requirements
Extend the `Settings` screen.

### 7.1 Notification Channels section must display
- Push permission status
- Push device registration status if available
- Reminder email address
- Telegram connection status

### 7.2 Available actions
- enable push permissions;
- connect Telegram;
- disconnect Telegram;
- view channel availability state.

---

## 8. Delivery orchestration rules

### 8.1 Channel selection
A reminder may use one or many channels.

For MVP delivery policy, send all selected channels independently for the same occurrence.
Do not implement fallback sequence logic yet unless explicitly required.

### 8.2 Logging
Every channel attempt must create or update a `reminder_delivery_logs` record.
Silent send attempts are not allowed.

### 8.3 Failure handling
If a provider send fails:
- log the failure;
- surface the error in structured logs;
- allow worker retry according to queue policy where safe;
- preserve idempotency.

---

## 9. User flows in this phase

### Flow A. Enable push notifications
1. User opens Settings.
2. User sees push channel state.
3. User grants notification permission.
4. Device token is registered.
5. Push becomes available for reminder delivery.

### Flow B. Connect Telegram
1. User opens Settings.
2. User taps `Connect Telegram`.
3. App provides bot connection flow.
4. User completes bot interaction.
5. Telegram shows as connected.

### Flow C. Reminder is delivered via selected channels
1. Reminder reaches scheduled execution.
2. Worker processes the reminder.
3. Worker attempts selected channels.
4. Delivery logs are written.
5. User receives push/email/Telegram as configured.

---

## 10. Acceptance criteria
This phase is complete only if:
- push registration works;
- email sending works;
- Telegram connection works;
- reminders can be delivered through all three channels;
- delivery logs are written for every attempt;
- Settings correctly reflects channel connection/permission state;
- deep link payload exists for push/email content where appropriate.

---

## 11. Tests required in this phase
Minimum required:
- API tests for push token registration;
- provider module tests for email sender abstraction;
- Telegram connection verification test;
- worker integration test covering multi-channel delivery;
- delivery log test proving every send attempt produces a record.

---

## 12. What the agent must not do in this phase
- do not fake provider success without logging;
- do not trust Telegram IDs from client payloads;
- do not assume a single device token per user;
- do not skip Settings channel state UI.
