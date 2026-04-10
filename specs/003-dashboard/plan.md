# Implementation Plan: Dashboard Improvements

**Branch**: `003-dashboard` | **Date**: 2026-04-10 | **Spec**: [spec.md](./spec.md)

## Summary

Improve the Dashboard by adding a Rejected summary card, reordering the four summary cards, replacing the pie chart with a plain Submissions leaderboard, and adding an Attendance leaderboard. All data comes from the existing `/api/submissions` fetch — no new API endpoints or schema changes needed. The Recharts dependency can be removed entirely.

## Technical Context

**Language/Version**: TypeScript / Node.js 20
**Primary Dependencies**: Next.js 14 (App Router), React 18, Tailwind CSS
**Storage**: N/A — all data already fetched from `/api/submissions`
**Testing**: `npm test && npm run lint`
**Target Platform**: Desktop web
**Project Type**: Web application
**Performance Goals**: Standard — dashboard should render in under 1 second
**Constraints**: Single file change (`src/app/(app)/page.tsx`); no new dependencies
**Scale/Scope**: Small internal tool

## Constitution Check

Constitution is a blank template — no project-specific gates. No violations.

## Existing Code Assessment

| File | Relevant state | Change needed |
|------|---------------|---------------|
| `src/app/(app)/page.tsx` | 3 summary cards (Total, Approved, Pending); pie chart for submissions by event; no-show leaderboard (top 5) | ⚠️ All changes in this file |
| `src/app/api/submissions/route.ts` | Returns full submission list with event + contact relations | ✅ None |
| `package.json` | `recharts` listed as dependency | ⚠️ Remove import (package removal optional) |

## Design Decisions

### Summary cards
Change the card array from 3 items to 4, in order: Total submissions, Approved, Rejected, Pending. The `rejected` count is already computed in the existing file.

### Submissions leaderboard
Replace the `<PieChart>` block with a ranked list identical in structure to the No-show leaderboard:
- Rank number (1–10), event name, submission count (right-aligned, bold)
- No percentages, no colours, no chart library
- Cap at top 10 events

### No-show leaderboard
Update `.slice(0, 5)` → `.slice(0, 10)`. No other changes.

### Attendance leaderboard
Derive from the same `contactStats` map already built for no-shows. Sort descending by `attended`, slice top 10, exclude contacts with 0 attended. Row format: name + `"X attended · Y approved"` subtitle — mirroring the no-show row.

### Layout
Two-column grid. Left: Submissions leaderboard. Right: No-show leaderboard and Attendance leaderboard stacked vertically in separate white cards.

### Recharts
Remove `import { PieChart, … } from "recharts"` and the `COLORS` constant.

## Project Structure

### Documentation (this feature)

```text
specs/003-dashboard/
├── plan.md              ← this file
├── spec.md
├── checklists/
│   └── requirements.md
└── tasks.md             ← /speckit.tasks output
```

### Source Code (single file)

```text
src/app/(app)/page.tsx    ← only file that changes
```
