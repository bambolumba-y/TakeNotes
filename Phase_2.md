# Phase_2.md

## Phase 2. App shell, authentication, theme system, and account settings foundation

## 1. Objective
Implement the global app shell, user authentication, theme system, and core account settings foundation. This phase establishes the runtime user context for the rest of the product.

At the end of this phase, a user must be able to sign up, sign in, persist a session, sign out, switch appearance mode, and reach all five major app sections through the real mobile shell.

---

## 2. Scope of this phase
This phase must include:
- Supabase Auth integration;
- authenticated vs unauthenticated routing;
- account bootstrap flow;
- appearance settings;
- theme tokens and runtime theme switching;
- base `Settings` screen;
- global FAB shell behavior;
- account profile storage for timezone and locale.

This phase must not include:
- note CRUD;
- reminder CRUD;
- reminder scheduling;
- delivery integrations.

---

## 3. Authentication requirements
Use Supabase Auth with **email + password**. Do not use magic link as the primary auth mode in MVP.

### 3.1 Required auth screens
Implement:
- Sign In
- Sign Up
- Forgot Password

### 3.2 Auth behavior
- user can create an account with email and password;
- user can sign in with email and password;
- user can sign out;
- session must persist between app launches;
- unauthenticated users must not access the tab shell;
- authenticated users must bypass auth screens automatically when a valid session exists.

### 3.3 Post-sign-up bootstrap
After sign-up, the app must ensure the user profile exists in the application database.

Profile fields required at this phase:
- `id`
- `email`
- `display_name` (nullable at first)
- `timezone`
- `locale`
- `created_at`
- `updated_at`

Timezone should default to device timezone if available.
Locale should default to device locale if available.

---

## 4. Required backend support in this phase
Even though Supabase handles auth, the API must provide authenticated bootstrap/profile endpoints.

### 4.1 Required API routes
Implement at minimum:
- `GET /me`
- `PATCH /me`

### 4.2 `/me` behavior
Returns the authenticated user profile.

### 4.3 `PATCH /me` behavior
Must support updating:
- `display_name`
- `timezone`
- `locale`
- `appearance_mode` (`system | light | dark`)

### 4.4 Authorization
These routes must require an authenticated user token.
The API must resolve the current user identity from the incoming auth context and never trust a client-passed `user_id`.

---

## 5. Theme system requirements
This phase must fully establish light and dark theme support.

### 5.1 Required theme architecture
Create a dedicated theme layer in mobile:

```text
src/theme/
  tokens.ts
  light.ts
  dark.ts
  index.ts
  ThemeProvider.tsx
  useTheme.ts
```

### 5.2 Theme modes
Support exactly these modes:
- `system`
- `light`
- `dark`

### 5.3 Theme switching behavior
- when the user selects `system`, use the OS appearance;
- when the user selects `light`, force light mode;
- when the user selects `dark`, force dark mode;
- user preference must persist in profile or local persisted settings;
- all implemented screens must react to theme changes without a reload.

### 5.4 Component rule
New components built from this phase onward must consume design tokens from the theme provider. No hardcoded screen colors are allowed.

---

## 6. App shell requirements

### 6.1 Auth split
The app must have a clear route split:
- unauthenticated stack;
- authenticated tab shell.

### 6.2 Tab shell
The real five-tab shell must now be active and styled using the design system.
Tabs:
- Notes
- Reminders
- Archive
- Organize
- Settings

### 6.3 Global FAB
The FAB must now be real in the shell, even if some creation routes are still placeholder forms.

Required FAB behavior:
- visible on main tabs;
- opens a modal sheet or action menu;
- shows four actions:
  - New Note
  - New Reminder
  - New Folder
  - New Theme

Actions whose target forms are not implemented yet may route to placeholder screens with “coming in next phase” messaging, but the navigation structure must exist.

---

## 7. Settings screen requirements
Build the initial real `Settings` screen.

### 7.1 Required sections
- Appearance
- Account
- About

### 7.2 Appearance section
Must provide controls for:
- System
- Light
- Dark

### 7.3 Account section
Must display:
- email
- display name
- timezone
- locale
- sign out action

### 7.4 About section
At minimum show:
- app name
- app version placeholder

---

## 8. User flows in this phase

### Flow A. Sign up
1. User opens app.
2. User sees Sign In and Sign Up options.
3. User opens Sign Up.
4. User enters email and password.
5. Account is created.
6. User profile is created or bootstrapped.
7. User is routed into the tab shell.

### Flow B. Sign in
1. Existing user opens app.
2. User enters credentials.
3. Session is established.
4. User is routed into the tab shell.

### Flow C. Reopen app with existing session
1. User closes app.
2. User reopens app.
3. Session is restored.
4. User lands directly in the authenticated shell.

### Flow D. Change appearance mode
1. User opens Settings.
2. User selects Appearance.
3. User chooses System, Light, or Dark.
4. The active theme changes immediately.
5. Preference persists.

### Flow E. Sign out
1. User opens Settings.
2. User taps Sign Out.
3. Session is cleared.
4. User is routed back to Sign In.

---

## 9. Data and persistence requirements
### 9.1 User profile table
Ensure the `users` table or equivalent profile table is available and includes:
- `id`
- `email`
- `display_name`
- `timezone`
- `locale`
- `appearance_mode`
- `created_at`
- `updated_at`

### 9.2 Session handling
Mobile app must store and restore auth session according to Supabase best practices.

### 9.3 Appearance persistence
Appearance selection must persist between launches.
Preference may be stored in profile and optionally mirrored locally for boot speed.

---

## 10. Validation requirements
Use Zod for:
- sign in form;
- sign up form;
- forgot password form;
- update profile form.

All form fields must show validation errors in the UI.

---

## 11. Acceptance criteria
This phase is complete only if:
- user can sign up;
- user can sign in;
- user can sign out;
- session persistence works;
- `GET /me` and `PATCH /me` work;
- tab shell is accessible only after authentication;
- Settings screen exists and is functional;
- light and dark themes both work across all implemented screens;
- no hardcoded screen colors are introduced.

---

## 12. Tests required in this phase
Minimum required:
- auth service unit tests or integration coverage for sign-in state handling;
- API tests for `/me` auth guard behavior;
- UI tests or equivalent coverage for appearance mode switching;
- one persistence test proving the selected appearance mode survives app restart.

---

## 13. What the agent must not do in this phase
- do not start notes/reminders CRUD in a half-finished way;
- do not postpone theme system implementation;
- do not treat dark mode as a future polish task;
- do not use placeholder fake auth;
- do not store `user_id` from client payloads for profile updates.
