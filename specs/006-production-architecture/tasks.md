# Tasks: Production Architecture

**Input**: Design documents from `/specs/006-production-architecture/`
**Branch**: `006-production-architecture`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Secrets Audit & Documentation

- [ ] T001 [US4] Audit the codebase for hardcoded secrets: search all `.ts`, `.tsx`, and config files for patterns like passwords, tokens, connection strings, API keys, and email addresses that should not be committed. Confirm `.env` and `prisma/*.db` are gitignored and contain nothing that would need to be scrubbed from history.

- [ ] T002 [P] [US4] Create `.env.example` at the project root listing every environment variable the app requires, with a short description and placeholder value for each. Include: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `BLOB_READ_WRITE_TOKEN`, `STAGING_PASSWORD`, `NEXT_PUBLIC_ENVIRONMENT`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`.

**Checkpoint**: Running `git grep -i "password\|secret\|token\|apikey"` on tracked files returns no real credentials. `.env.example` exists and documents all variables.

---

## Phase 2: Database — Turso / libSQL Adapter

- [ ] T003 [US1] Install the libSQL packages:
  ```
  npm install @libsql/client @prisma/adapter-libsql
  ```

- [ ] T004 [US1] In `prisma/schema.prisma`, add `previewFeatures = ["driverAdapters"]` to the `generator client` block. Run `npx prisma generate` to regenerate the Prisma client with adapter support.

- [ ] T005 [US1] Rewrite `src/lib/prisma.ts` to use the libSQL adapter conditionally:
  - If `process.env.DATABASE_AUTH_TOKEN` is set, instantiate `@libsql/client` with `url: DATABASE_URL` and `authToken: DATABASE_AUTH_TOKEN`, wrap it in `PrismaLibSQL`, and pass the adapter to `PrismaClient`.
  - If `DATABASE_AUTH_TOKEN` is not set (local development), fall back to `new PrismaClient()` as before.
  - Preserve the existing singleton pattern (`globalForPrisma`) so hot-reload in dev still works.

**Checkpoint**: `npx tsc --noEmit` passes. The app starts locally with `npm run dev` and database reads/writes work against the local SQLite file (no `DATABASE_AUTH_TOKEN` set).

---

## Phase 3: Image Storage — Vercel Blob

- [ ] T006 [P] [US2] Install the Vercel Blob package:
  ```
  npm install @vercel/blob
  ```

- [ ] T007 [US2] Rewrite `src/app/api/user/avatar/route.ts` to use Vercel Blob:
  - If `BLOB_READ_WRITE_TOKEN` is not set, return `501 Not Implemented` with message `"Image upload requires BLOB_READ_WRITE_TOKEN"` (graceful local dev fallback).
  - Look up the user's current `image` field from the database.
  - Call `put()` from `@vercel/blob` to upload the new file with `access: "public"`. Use `${user.id}.${ext}` as the filename with `allowOverwrite: true`.
  - If the user already has a Blob URL (starts with `https://`), call `del()` on the old URL to remove the previous image.
  - Save the new Blob URL to `user.image` in the database.
  - Remove all `fs`, `path`, `writeFile`, and `mkdir` imports — the local filesystem is no longer used.

**Checkpoint**: The avatar route compiles. When `BLOB_READ_WRITE_TOKEN` is absent, POSTing to `/api/user/avatar` returns 501. The `public/uploads/avatars` directory reference is gone from the codebase.

---

## Phase 4: Seed Script

- [ ] T008 [P] [US1] Create `prisma/seed.ts`:
  - Read `SEED_ADMIN_EMAIL` from `process.env` — exit with a clear error if not set.
  - Read `SEED_ADMIN_NAME` from `process.env` — default to `"Admin"` if not set.
  - Check if a user with `SEED_ADMIN_EMAIL` already exists; if so, log "Admin user already exists, skipping." and exit cleanly (idempotent).
  - If not, create an `active` user with `role: "Admin"` and the provided email and name.
  - Log the created user's email on success.
  - The `db:seed` script is already wired in `package.json` — no changes needed there.

**Checkpoint**: Running `SEED_ADMIN_EMAIL=test@example.com npm run db:seed` against the local database creates the user on first run and skips on second run.

---

## Phase 5: Staging Environment

- [ ] T009 [US3] Rewrite `src/middleware.ts` to add staging password protection before the NextAuth check:
  - If `process.env.STAGING_PASSWORD` is set **and** the request path does not start with `/api/auth` and is not `/login`:
    - Read the `Authorization` header.
    - Decode the Basic auth value (`Basic base64(anything:PASSWORD)`) and compare the password portion to `STAGING_PASSWORD`.
    - If missing or wrong, return a `NextResponse` with status `401`, header `WWW-Authenticate: Basic realm="Staging"`, and a plain-text body `"Staging access required"`.
  - If the check passes (or `STAGING_PASSWORD` is not set), continue to the existing NextAuth `withAuth` logic.
  - Keep the existing `matcher` config unchanged — route protection rules are not affected.

- [ ] T010 [P] [US3] Create `src/components/layout/StagingBanner.tsx`:
  - A server component that returns `null` when `process.env.NEXT_PUBLIC_ENVIRONMENT !== "staging"`.
  - When staging, renders a fixed amber bar (`fixed top-0 left-0 right-0 z-50`) with the text "STAGING — changes here do not affect production", centred, in a dark amber text on amber background.

- [ ] T011 [US3] Add `<StagingBanner />` to `src/app/(app)/layout.tsx` as the first child inside the outermost element, so it sits above all other app chrome. Add `pt-8` (or equivalent) to the main layout container so page content is not hidden beneath the banner when it is visible.

**Checkpoint**: With `NEXT_PUBLIC_ENVIRONMENT=staging` set locally, the amber banner appears at the top of every app page. Without it set, the banner is invisible. With `STAGING_PASSWORD=test` set locally, navigating to any app route triggers a browser Basic Auth prompt; entering the wrong password re-prompts; entering the correct password proceeds normally.

---

## Phase 6: Final Checks

- [ ] T012 [P] [US4] Add an MIT `LICENSE` file to the project root. Use the standard MIT licence text with the copyright holder set to the current year and "Hammarby Fotboll".

- [ ] T013 Run `npx tsc --noEmit` — must exit with zero errors.

- [ ] T014 Commit all changes on branch `006-production-architecture`. The commit message body must include a brief setup guide covering: (1) manual platform steps (Turso, Vercel, Mailtrap, Blob), (2) required environment variables per environment, (3) first-deploy commands (`prisma db push` + `npm run db:seed`), and (4) GitHub repo creation and branch push commands.

---

## Dependencies & Execution Order

- T001 is a read-only audit and can run first in parallel with nothing.
- T003 must complete before T004, and T004 before T005 (package → schema → client).
- T006 must complete before T007 (package → route).
- T008, T002, T009, T010 can all run in parallel once T001 is done.
- T011 depends on T010 (component must exist before inserting it).
- T012 depends on all prior tasks.

### Parallel Opportunities

```
T001 (audit) ──► T002 (env.example)       ──┐
T003 ──► T004 ──► T005 (DB adapter)        ──┤
T006 ──► T007 (Blob)                        ──┤──► T013 ──► T014
T008 (seed)                                ──┤
T009 (middleware)                          ──┤
T010 ──► T011 (staging banner)             ──┤
T012 (LICENSE)                             ──┘
```

---

## Implementation Strategy

1. T001 (audit, read-only) — confirm the repo is clean before touching anything
2. T002 + T003 in parallel — docs and package install
3. T004 → T005 sequentially — schema then client
4. T006 → T007 sequentially — package then route
5. T008 + T009 + T010 + T012 in parallel — seed, middleware, banner component, licence
6. T011 — insert banner into layout
7. T013 → T014 — type-check and commit with setup guide
