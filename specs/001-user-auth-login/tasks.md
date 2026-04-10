# Tasks: User Accounts, Login Flow & User Management

**Input**: Design documents from `/specs/001-user-auth-login/`
**Branch**: `001-user-auth-login`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

---

## Phase 1: Setup

**Purpose**: No new project structure needed — this feature modifies existing files. Verify starting state is clean.

- [ ] T001 Confirm branch is `001-user-auth-login` and working tree is clean (`git status`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema migration and data seeding MUST be complete before any auth or UI changes. Removing the whitelist without first seeding users would lock everyone out.

**⚠️ CRITICAL**: Complete and verify each task in order before moving to user stories.

- [ ] T002 Add `status`, `invitedBy`, and `invitedAt` fields to the `User` model in `prisma/schema.prisma` (see data-model.md)
- [ ] T003 Run Prisma migration: `npx prisma migrate dev --name add-user-status-and-invite-fields`
- [ ] T004 Write and run a seed script `prisma/seed-users.ts` that upserts the three whitelisted users (`henrik.stahl@hammarbyfotboll.se`, `david.jesperson.mora@hammarbyfotboll.se`, `lukas.lundberg@hammarbyfotboll.se`) as `status: "active"`, `role: "Admin"` — also sets any existing NextAuth-created User records to `status: "active"`
- [ ] T005 Add `sendInvitationEmail(email: string, invitedByName: string)` function to `src/lib/mailer.ts` — styled consistently with the existing magic link email, explains that the recipient has been invited to Acca and links to the login page

**Checkpoint**: Database has status field, existing users are seeded as active admins, invitation email helper is ready.

---

## Phase 3: User Story 1 — Log in to Acca (Priority: P1) 🎯 MVP

**Goal**: Replace the hardcoded whitelist with DB-based access control. Enforce session and magic link expiry. Check user status on every request.

**Independent Test**: Log in with a seeded email → magic link arrives → clicking it grants access. Attempt login with an unknown email → rejected. Deactivate a user in the DB directly → their next request is rejected.

- [ ] T006 [US1] Update `src/lib/auth.ts`: remove `WHITELIST` array and replace the `signIn` callback with a DB lookup that checks the user exists and `status !== "inactive"` (see research.md)
- [ ] T007 [US1] Update `src/lib/auth.ts`: set `session.maxAge` to `86400` (24 hours) and set `EmailProvider.maxAge` to `600` (10 minutes) (see research.md)
- [ ] T008 [US1] Update `src/lib/auth.ts`: add status check to the `session` callback — query the DB on every request and return an empty session if the user is inactive (FR-018, see research.md)
- [ ] T009 [US1] Update `src/lib/auth.ts`: in the `jwt` callback, if `user.status === "invited"` on first sign-in, update the DB record to `status: "active"` (see research.md)

**Checkpoint**: Login works for seeded users. Unknown emails are rejected. Magic links expire after 10 minutes. Deactivated users are blocked on next request.

---

## Phase 4: User Story 2 — Manage Own Profile (Priority: P2)

**Goal**: Verify profile management is complete and working — name, phone, avatar.

**Independent Test**: Navigate to Settings → update name → save → name updates in sidebar. Upload avatar → avatar updates. Update phone → saved correctly.

- [ ] T010 [US2] Read `src/app/(app)/settings/page.tsx` and verify it has a complete profile section covering name, phone number, avatar upload, and notification preferences — note any gaps
- [ ] T011 [US2] Fix any gaps found in T010 in `src/app/(app)/settings/page.tsx` (skip if no gaps found)

**Checkpoint**: Profile management fully functional for all logged-in users.

---

## Phase 5: User Story 3 — Invite and Manage Users (Priority: P3)

**Goal**: Admins can invite new users, change roles, and deactivate accounts from the Team section of the Settings page.

**Independent Test**: Log in as Admin → go to Settings → see Team section with user table → invite a new user → invitation email arrives → change a user's role inline → toggle a user inactive → that user can no longer log in.

### API Layer

- [ ] T012 [US3] Create `src/app/api/users/route.ts` with:
  - `GET` handler: returns all users (id, name, email, image, role, status, invitedAt) — Admin only, returns 403 otherwise
  - `POST` handler: validates email + role, checks email not already taken, creates User record with `status: "invited"`, calls `sendInvitationEmail()`, returns 201 — Admin only
- [ ] T013 [US3] Create `src/app/api/users/[id]/route.ts` with:
  - `PUT` handler: accepts `{ role?, status? }`, validates Admin-only access, enforces last-admin protection (cannot demote or deactivate last Admin), prevents self-deactivation, returns updated user — see contracts/users-api.md

### Settings Page — Team Section

- [ ] T014 [US3] Update `src/app/(app)/settings/page.tsx`: add a Team section below the profile section, visible only when `session.user.role === "Admin"` — includes section heading and "Invite user" button (yellow primary button, consistent with rest of app)
- [ ] T015 [US3] Update `src/app/(app)/settings/page.tsx`: add state and data fetching (`GET /api/users`) for the user list, and render an inline-editable user table with columns: Name, Email, Role (dropdown: Admin/User), Status (active/inactive toggle), with the current user's own row having role and status controls disabled
- [ ] T016 [US3] Update `src/app/(app)/settings/page.tsx`: wire role dropdown to `PUT /api/users/[id]` — change saves immediately on selection, with optimistic UI update and error rollback
- [ ] T017 [US3] Update `src/app/(app)/settings/page.tsx`: wire active/inactive toggle to `PUT /api/users/[id]` — change saves immediately on toggle, with optimistic UI update and error rollback
- [ ] T018 [US3] Update `src/app/(app)/settings/page.tsx`: add "Invite user" modal — fields: email address, role (Admin/User, default User) — submits to `POST /api/users`, shows success message on completion, adds new user to the list

**Checkpoint**: Admin can see all users, invite new ones, change roles inline, toggle active/inactive. Non-admins do not see the Team section.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T019 [P] Remove the `WHITELIST` export from `src/lib/auth.ts` and check for any other files that import it — update or remove those imports
- [ ] T020 [P] Verify `src/middleware.ts` correctly handles the `/api/users` routes — ensure they are not accidentally excluded from auth protection
- [ ] T021 Smoke test the full flow end-to-end: seed → login → profile edit → invite new user → new user logs in → admin deactivates user → deactivated user is blocked
- [ ] T022 Commit all changes with a descriptive message

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (Setup): Start immediately
- **Phase 2** (Foundational): After Phase 1 — **BLOCKS all user stories**
- **Phase 3** (US1 — Login): After Phase 2 — must complete before US3 (deactivation check depends on auth)
- **Phase 4** (US2 — Profile): After Phase 2 — independent of US1 and US3
- **Phase 5** (US3 — User Management): After Phase 3 (needs working auth + status enforcement)
- **Phase 6** (Polish): After all user stories

### Critical Ordering Within Phase 2

T002 → T003 → T004 (migration must run before seed; seed must run before whitelist removal in Phase 3)

### Parallel Opportunities

Within Phase 5: T012 and T013 can run in parallel (different files). T014–T018 must run sequentially (same file).

---

## Implementation Strategy

### MVP (User Stories 1 + 2 only)

1. Complete Phase 2 (Foundational)
2. Complete Phase 3 (US1 — Login)
3. Complete Phase 4 (US2 — Profile, verify only)
4. **STOP and VALIDATE**: Working auth with DB-based access, no whitelist
5. Add Phase 5 (US3 — User Management) once MVP is stable

### Incremental Delivery

1. Phase 2 complete → everyone can still log in, whitelist still active
2. Phase 3 complete → whitelist removed, DB-based auth live ← **risky step, validate carefully**
3. Phase 4 complete → profile management verified
4. Phase 5 complete → admins can invite and manage users
5. Phase 6 complete → polished and committed
