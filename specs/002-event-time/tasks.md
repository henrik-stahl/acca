# Tasks: Event Kick-off Time

**Input**: Design documents from `/specs/002-event-time/`  
**Branch**: `002-event-time`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

## Phase 1: Setup

No setup tasks required — branch already exists, no new dependencies, no schema migration.

---

## Phase 2: Foundational

No foundational tasks required — `eventDate` is already `DateTime`, all API routes and the `formatDate` utility already handle time. No changes needed before user story work begins.

---

## Phase 3: User Story 1 — Set kick-off time when creating/editing an event (Priority: P1) 🎯 MVP

**Goal**: Users can enter both date and time when creating or editing an event, and the full datetime is stored correctly.

**Independent Test**: Create a new event with date 2026-05-01 and time 18:00. Reload the page and open the event drawer. Verify the Event date row shows "1 maj 2026, 18:00".

- [ ] T001 [US1] Update Add event form in `src/app/(app)/events/page.tsx`: replace single `<input type="date">` with side-by-side date + time inputs; add `eventTime` field to `addForm` state (default `"18:00"`); combine into ISO string (`new Date(\`\${date}T\${time}\`).toISOString()`) before POST; require both fields for submit button
- [ ] T002 [P] [US1] Update Edit form in `src/components/events/EventDrawer.tsx`: add date and time fields pre-populated by splitting `event.eventDate` (format date as `YYYY-MM-DD`, time as `HH:MM`); add `eventTime` to local form state; combine on save (existing `payload.eventDate = new Date(...).toISOString()` line already handles conversion)

**Checkpoint**: Create a new event with a time. Open it in the drawer. Confirm the time is preserved after reload.

---

## Phase 4: User Story 2 — Kick-off time visible in the event list (Priority: P2)

**Goal**: Both the Upcoming and Past event tables show date and time for each event.

**Independent Test**: With at least one event that has a non-midnight time, verify both the Upcoming and Past tables show "YYYY-MM-DD HH:MM" (or the Swedish locale equivalent).

- [ ] T003 [US2] Update event list date display in `src/app/(app)/events/page.tsx`: replace bare `.toLocaleDateString("sv-SE")` calls in both the Upcoming table rows and Past table rows with `formatDate(e.eventDate, true)` (already imported via utils); also update the CSV export date column in `handleExport` to include time

**Checkpoint**: The event list shows date and time for all events in both sections.

---

## Phase 5: User Story 3 — Kick-off time in exported accreditation documents (Priority: P3)

**Goal**: The Excel acklista export shows the correct kick-off time.

**Independent Test**: Export the accreditation list for an event with a non-midnight time. Verify row 3 of the spreadsheet shows the correct time (e.g., "fre 1 maj | 18.00 | Tele2 Arena").

- [ ] T004 [US3] Verify `src/app/api/events/[id]/export/route.ts` — `swedishDate()` already formats `HH.MM`; no code change expected. Confirm by exporting an event created after T001. If the time shows `00.00`, investigate whether the stored value is UTC-offset and adjust the display function to use Stockholm local time explicitly.

**Checkpoint**: Exported acklista shows correct kick-off time in the date row.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T005 Smoke test: create event → verify list shows time → open drawer → edit time → verify update → export → verify export shows time
- [ ] T006 Commit all changes on branch `002-event-time`

---

## Dependencies & Execution Order

- T001 and T002 can run in **parallel** (different files)
- T003 depends on T001 being complete (same file — do after T001 to avoid conflicts)
- T004 depends on T001 (needs a real event with time to test against)
- T005–T006 depend on T001–T004

### Parallel Opportunities

```
T001 (events/page.tsx — form)    ──┐
T002 (EventDrawer.tsx — edit)    ──┴──► T003 (events/page.tsx — list) ──► T004 (export verify) ──► T005 smoke test ──► T006 commit
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Complete T001 + T002 in parallel
2. Validate: create event with time, verify stored and displayed in drawer
3. Done — US1 already delivers the core value

### Full delivery

1. T001 + T002 in parallel
2. T003 (list display)
3. T004 (export verify)
4. T005 smoke test → T006 commit
