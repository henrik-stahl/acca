# Tasks: Dashboard Improvements

**Input**: Design documents from `/specs/003-dashboard/`
**Branch**: `003-dashboard`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

No setup tasks required — single file change, no new dependencies, no schema migration.

---

## Phase 2: Foundational

No foundational tasks required — all data already available from existing `/api/submissions` fetch and `contactStats` map in `src/app/(app)/page.tsx`.

---

## Phase 3: User Story 1 — Four summary cards in correct order (Priority: P1) 🎯 MVP

**Goal**: Dashboard shows Total submissions, Approved, Rejected, Pending cards in that order.

**Independent Test**: Open the Dashboard and confirm four cards appear left-to-right: Total submissions, Approved, Rejected, Pending, each with the correct count.

- [ ] T001 [US1] Update summary cards in `src/app/(app)/page.tsx`: change the grid from `grid-cols-3` to `grid-cols-4` and update the card array to `[{ label: "Total submissions", value: total }, { label: "Approved", value: approved }, { label: "Rejected", value: rejected }, { label: "Pending", value: pending }]` — `rejected` is already computed in the file

**Checkpoint**: Four summary cards visible in correct order with correct counts.

---

## Phase 4: User Story 2 — Submissions leaderboard (Priority: P2)

**Goal**: Pie chart replaced with a plain ranked list of events by submission count, headed "Submissions leaderboard", top 10, no percentages.

**Independent Test**: With submissions across multiple events, confirm a ranked list (no chart) appears showing rank, event name, and count. Confirm the heading reads "Submissions leaderboard".

- [ ] T002 [US2] Remove Recharts import and `COLORS` constant from `src/app/(app)/page.tsx`: delete `import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"` and `const COLORS = [...]`
- [ ] T003 [US2] Replace pie chart data prep in `src/app/(app)/page.tsx`: rename `pieData` to `submissionLeaders`, change `.slice(0, 7)` to `.slice(0, 10)`, remove the `const total` reassignment (keep `total` from `submissions.length`)
- [ ] T004 [US2] Replace pie chart JSX in `src/app/(app)/page.tsx`: remove the `<ResponsiveContainer>` / `<PieChart>` block and replace with a ranked list using the same row structure as the No-show leaderboard — rank number, event name, submission count right-aligned in bold; update the section heading from "Submissions" to "Submissions leaderboard"

**Checkpoint**: No chart renders. Ranked event list visible with counts, no percentages.

---

## Phase 5: User Story 3 — Attendance leaderboard (Priority: P3)

**Goal**: New Attendance leaderboard shows top 10 contacts ranked by attended count, each row showing name + "X attended · Y approved".

**Independent Test**: With at least one contact who has an attended approved submission, confirm the Attendance leaderboard appears with that contact, showing correct attended and approved counts.

- [ ] T005 [US3] Update No-show leaderboard slice in `src/app/(app)/page.tsx`: change `noShowLeaders` `.slice(0, 5)` → `.slice(0, 10)`
- [ ] T006 [US3] Derive `attendanceLeaders` in `src/app/(app)/page.tsx` from the existing `contactStats` map: `Object.values(contactStats).filter(c => c.attended > 0).sort((a, b) => b.attended - a.attended).slice(0, 10)`
- [ ] T007 [US3] Add Attendance leaderboard JSX in `src/app/(app)/page.tsx`: new white card below the No-show leaderboard in the right column, heading "Attendance leaderboard", same row structure as No-show leaderboard — rank, name, subtitle `"{c.attended} attended · {c.approved} approved"`, attended count right-aligned in green; empty state "No attendance recorded yet."

**Checkpoint**: Attendance leaderboard visible with correct data. No-show leaderboard now shows top 10.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T008 Verify layout in `src/app/(app)/page.tsx`: confirm two-column grid has Submissions leaderboard on the left and No-show + Attendance leaderboards stacked on the right; adjust column grid if needed (e.g. right column may need `flex flex-col gap-4`)
- [ ] T009 Smoke test: open Dashboard, verify 4 summary cards, Submissions leaderboard (no chart), No-show leaderboard, Attendance leaderboard all render correctly with empty states where applicable
- [ ] T010 Commit all changes on branch `003-dashboard`

---

## Dependencies & Execution Order

- T001 has no dependencies — start immediately
- T002, T003, T004 are sequential (same file section) — do after T001
- T005, T006, T007 can start after T001 (different section of the file)
- T008 depends on T004 and T007
- T009–T010 depend on all prior tasks

### Parallel Opportunities

```
T001 ──► T002 ──► T003 ──► T004 ──┐
                                   ├──► T008 ──► T009 ──► T010
T001 ──► T005 ──► T006 ──► T007 ──┘
```

---

## Implementation Strategy

### MVP (User Story 1 only)
1. Complete T001
2. Validate: four cards in correct order
3. Already delivers immediate value

### Full delivery
1. T001 → T002 → T003 → T004 (summary + submissions leaderboard)
2. T005 → T006 → T007 (attendance leaderboard)
3. T008 → T009 → T010 (polish + commit)
