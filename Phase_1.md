# Phase_1.md

## Phase 1. Monorepo setup, base architecture, and infrastructure skeleton

## 1. Objective
Build the complete technical foundation of the project before any real product logic is implemented. At the end of this phase, the repository must be runnable, type-safe, structured, and ready for domain work.

This phase exists to remove architectural ambiguity. It is not allowed to skip this phase and start directly with screens or database CRUD.

---

## 2. Scope of this phase
This phase must include:
- monorepo creation;
- package manager and task runner setup;
- mobile app skeleton;
- API service skeleton;
- shared package skeleton;
- environment variable structure;
- local infrastructure setup;
- linting, formatting, and strict TypeScript configuration;
- basic health routes and boot-time validation.

This phase must not include:
- full notes or reminders business logic;
- full authentication flows;
- actual production UI screens beyond shell placeholders;
- delivery channel integrations.

---

## 3. Required repository structure
The repository must be created with this exact top-level structure:

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
  .editorconfig
  .gitignore
  .prettierrc
  eslint.config.js
```

### 3.1 Package manager and workspace
- Use `pnpm`.
- Use `turborepo` for workspace task orchestration.
- Root `package.json` must expose scripts for:
  - `dev`
  - `build`
  - `lint`
  - `typecheck`
  - `test`

### 3.2 Shared TypeScript configuration
Create `tsconfig.base.json` at root.

Requirements:
- `strict: true`
- no implicit any
- path aliases for shared package
- consistent module resolution across mobile and API

---

## 4. Mobile app skeleton
Create `apps/mobile` using Expo + Expo Router + TypeScript.

### 4.1 Required mobile structure
```text
apps/mobile/
  app/
    _layout.tsx
    (tabs)/
      _layout.tsx
      notes.tsx
      reminders.tsx
      archive.tsx
      organize.tsx
      settings.tsx
  src/
    components/
    features/
    hooks/
    lib/
    services/
    store/
    theme/
    types/
```

### 4.2 Required placeholder screens
Create real screen files for all five tabs.
Each screen must:
- render inside SafeArea;
- render a title;
- consume the theme provider;
- render a placeholder body;
- render without crashes in light and dark mode.

### 4.3 Navigation shell
The bottom tab navigator must exist in this phase.
The global FAB may be a placeholder component, but it must already be part of the shell layout.

---

## 5. API service skeleton
Create `apps/api` using Fastify + TypeScript.

### 5.1 Required API structure
```text
apps/api/
  src/
    index.ts
    server.ts
    config/
    db/
    lib/
    modules/
      health/
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

### 5.2 Required API endpoints in this phase
Only infrastructure endpoints are required now:
- `GET /health`
- `GET /ready`

Purpose:
- `health` returns process status.
- `ready` verifies env config, DB reachability, and Redis reachability where possible.

No product CRUD endpoints are required yet, but route module placeholders must exist.

---

## 6. Shared package
Create `packages/shared`.

### 6.1 Required structure
```text
packages/shared/
  src/
    constants/
    enums/
    schemas/
    types/
    contracts/
  package.json
  tsconfig.json
```

### 6.2 Initial shared content
Add initial placeholders for:
- reminder status enum;
- reminder priority enum;
- reminder channel enum;
- theme mode enum;
- common API response shape;
- Zod helper exports.

Do not leave the shared package empty.

---

## 7. Local infrastructure
The project needs local infrastructure from the start.

### 7.1 Required services
Create local development infra definitions for:
- PostgreSQL-compatible backend access via Supabase project usage;
- Redis;
- optional Redis UI is allowed but not required.

Because database auth and RLS are handled via Supabase, local infra should focus on Redis and app boot consistency. If Docker is used locally, place files in `infra/`.

### 7.2 Redis
Redis is required because the final system uses BullMQ.
Even though queue logic is not implemented yet, Redis connectivity and config scaffolding must already exist.

---

## 8. Environment configuration
Create environment variable templates.

### 8.1 Root principles
- no secrets committed to git;
- separate env files for mobile and API;
- startup must fail fast if critical env vars are missing.

### 8.2 Required API env variables
At minimum define placeholders for:
- `NODE_ENV`
- `PORT`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL`
- `SENTRY_DSN`
- `RESEND_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `EXPO_ACCESS_TOKEN` if needed for later integration

### 8.3 Required mobile env variables
At minimum define placeholders for:
- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`

### 8.4 Validation
Create runtime config validation using Zod on the API side.
If required values are missing, the server must refuse to start.

---

## 9. Tooling and quality gates

### 9.1 Formatting and linting
Add:
- ESLint
- Prettier

Requirements:
- root-level shared config;
- all workspace packages must use the same formatting rules;
- unused imports must be prevented or reported.

### 9.2 Type safety
TypeScript strict mode is mandatory for all apps and packages.

### 9.3 Error monitoring bootstrap
Add Sentry setup placeholders for both mobile and API. Full instrumentation is later, but the structure must exist now.

---

## 10. User flows in this phase
There are only technical validation flows in Phase 1.

### Flow A. App boot
1. Developer installs dependencies.
2. Developer runs workspace dev command.
3. Mobile app starts.
4. Five placeholder tabs render correctly.
5. Theme provider wraps the app shell.

### Flow B. API boot
1. Developer provides env values.
2. Developer starts API service.
3. API validates env values.
4. API exposes `/health` and `/ready`.

### Flow C. Shared package usage
1. Mobile and API both import one enum/type from `packages/shared`.
2. Build and typecheck succeed.

---

## 11. Required deliverables
At the end of this phase the repository must contain:
- working monorepo;
- mobile app shell;
- API service shell;
- shared package exports;
- lint/typecheck scripts;
- environment templates;
- Redis config scaffolding;
- root documentation for running the project.

---

## 12. Acceptance criteria
This phase is complete only if all of the following are true:
- `pnpm install` works at root;
- `pnpm dev` can run the workspace apps;
- mobile app renders the tab shell;
- API returns successful responses from `/health` and `/ready`;
- TypeScript strict mode passes;
- root lint command passes;
- shared package is actually consumed by both apps;
- env validation is real and not a TODO stub.

---

## 13. Tests required in this phase
Minimum required:
- one API test for `/health`;
- one config validation test for missing env rejection;
- one smoke test or equivalent validation proving the mobile app shell mounts without runtime errors.

---

## 14. What the agent must not do in this phase
- do not implement product CRUD yet;
- do not build actual reminder scheduling yet;
- do not add mock feature logic that will later be thrown away;
- do not skip the shared package;
- do not postpone theme provider setup to a later phase.
