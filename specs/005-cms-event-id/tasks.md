# Tasks: CMS Event ID

**Input**: Design documents from `/specs/005-cms-event-id/`
**Branch**: `005-cms-event-id`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

- [ ] T001 [US1/US2] Add `lastUpdatedAt DateTime?` to the `Event` model in `prisma/schema.prisma` and run `npx prisma migrate dev --name add-event-last-updated-at` to create the migration

**Checkpoint**: `prisma/migrations/` contains a new migration; `prisma/schema.prisma` has `lastUpdatedAt DateTime?` on the Event model.

---

## Phase 2: API

- [ ] T002 [P] [US1] In `src/app/api/events/[id]/route.ts`, wrap the `prisma.event.update` call in the PUT handler with try/catch; if the error code is `P2002` (unique constraint) return `NextResponse.json({ error: "CMS Event ID already in use" }, { status: 409 })`

- [ ] T003 [P] [US2] In `src/app/api/submissions/route.ts`, after finding an existing event by `cmsEventId` (line ~83–86), add a `prisma.event.update` call to set `eventName`, `eventDate` (as `new Date(eventDate)`), `competition`, `arena`, and `lastUpdatedAt: new Date()` — but only update a field if its value in the submission payload is truthy (so empty/null values never overwrite existing data)

**Checkpoint**: PUT /api/events/:id with a duplicate `cmsEventId` returns 409. POSTing a submission with a matching `cmsEventId` updates the four CMS-sourced fields and sets `lastUpdatedAt`.

---

## Phase 3: UI — Events Add Form

- [ ] T004 [US1] In `src/app/(app)/events/page.tsx`:
  - Add `cmsEventId: ""` to the `addForm` initial state (line ~45 and the reset on line ~156)
  - Add the `addForm` type to include `cmsEventId?: string`
  - Add an optional "CMS Event ID" text input below the Arena field in the add form (same styling as other text inputs); send `cmsEventId: addForm.cmsEventId || undefined` in the POST body (omit if empty)

**Checkpoint**: The Add Event form has a CMS Event ID field; creating an event with a value stores it correctly.

---

## Phase 4: UI — EventDrawer

- [ ] T005 [US1/US3] In `src/components/events/EventDrawer.tsx`, view mode:
  - Add `<DrawerRow label="CMS Event ID">{event.cmsEventId ?? "—"}</DrawerRow>` after the Arena row
  - Add `<DrawerRow label="Last updated">{event.lastUpdatedAt ? formatDate(event.lastUpdatedAt, true) : "—"}</DrawerRow>` after CMS Event ID row
  - Ensure `lastUpdatedAt` is included in the `EventWithSubmissions` type (or the Prisma type already covers it via the schema)

- [ ] T006 [US1] In `src/components/events/EventDrawer.tsx`, edit form:
  - Add `cmsEventId: event.cmsEventId ?? ""` to the form initialisation (line ~151)
  - Add a text input for CMS Event ID after the Arena input in the edit form
  - In `handleSave`, treat an empty `cmsEventId` string as `null` before sending (so staff can clear the field)
  - Show a visible error message if the PUT response returns status 409 (`"CMS Event ID already in use"`)

**Checkpoint**: EventDrawer shows CMS Event ID and Last updated in view mode. Edit form allows setting/clearing the CMS ID; duplicate IDs show an error.

---

## Phase 5: Polish & Cross-Cutting

- [ ] T007 Smoke test: create an event with a CMS ID; view it in the drawer; edit it and change the ID; attempt to assign a duplicate ID and confirm the error; verify Last updated shows "—" for manually-created events
- [ ] T008 Commit all changes on branch `005-cms-event-id`

---

## Dependencies & Execution Order

- T001 must complete before any other task (schema + migration)
- T002 and T003 can run in parallel after T001 (different files)
- T004 can run in parallel after T001 (different file from T002/T003)
- T005 and T006 are sequential (same file — EventDrawer)
- T007 depends on all prior tasks
- T008 depends on T007

### Parallel Opportunities

```
T001 ──► T002 (API: events PUT) ──┐
T001 ──► T003 (API: submissions) ──┤──► T007 ──► T008
T001 ──► T004 (UI: add form) ──────┤
T001 ──► T005 ──► T006 (Drawer) ──┘
```

---

## Implementation Strategy

1. T001 (migration) — required first
2. T002 + T003 + T004 in parallel
3. T005 → T006 (Drawer, sequential)
4. T007 → T008 (smoke test + commit)
