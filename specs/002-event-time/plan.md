# Implementation Plan: Event Kick-off Time

**Branch**: `002-event-time` | **Date**: 2026-04-10 | **Spec**: [spec.md](./spec.md)

## Summary

Add kick-off time to the event creation and edit flow. `eventDate` is already a `DateTime` in Prisma and the export already formats hours/minutes — the only work is updating the form inputs and list display. No schema migration, no API changes.

## Technical Context

**Language/Version**: TypeScript / Node.js 20  
**Primary Dependencies**: Next.js 14 (App Router), React 18, Tailwind CSS  
**Storage**: SQLite via Prisma ORM (`eventDate DateTime` — no migration needed)  
**Testing**: `npm test && npm run lint`  
**Target Platform**: Desktop web (Chrome/Safari/Firefox on macOS/Windows)  
**Project Type**: Web application  
**Performance Goals**: Standard — no special requirements  
**Constraints**: Datetime stored as UTC ISO string; displayed in Swedish local time  
**Scale/Scope**: Small internal tool (~3 admin users)

## Constitution Check

Constitution is a blank template — no project-specific gates defined. No violations.

## Existing Code Assessment

| File | Relevant state | Change needed |
|------|---------------|---------------|
| `prisma/schema.prisma` | `eventDate DateTime` | ✅ None — already DateTime |
| `src/lib/utils.ts` → `formatDate(d, includeTime)` | Already renders `HH:MM` when `includeTime=true` | ✅ None |
| `src/app/api/events/route.ts` | POST accepts `eventDate` and stores ISO string | ✅ None |
| `src/app/api/events/[id]/route.ts` | PUT accepts `eventDate` and stores ISO string | ✅ None |
| `src/app/api/events/[id]/export/route.ts` | `swedishDate()` already formats hours + minutes | ✅ None — will work once time is non-zero |
| `src/app/(app)/events/page.tsx` | Add form uses `<input type="date">`; list shows date only | ⚠️ Update form inputs + list display |
| `src/components/events/EventDrawer.tsx` | Edit form omits `eventDate` entirely; view calls `formatDate(d, true)` but time is 00:00 | ⚠️ Add date+time to edit form |

## Project Structure

### Documentation (this feature)

```text
specs/002-event-time/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
└── tasks.md             ← /speckit.tasks output
```

### Source Code (files to change)

```text
src/
└── app/
    └── (app)/
        └── events/
            └── page.tsx          ← add form + list display
src/
└── components/
    └── events/
        └── EventDrawer.tsx       ← edit form
```

## Design Decisions

### Date + Time input approach

Use **two separate inputs** (date picker + time picker) rather than `<input type="datetime-local">`:

- `datetime-local` renders inconsistently across browsers and cannot be styled with Tailwind to match the existing input aesthetic
- Two inputs (date + time side-by-side) match the existing form layout and are more readable
- They are combined into an ISO datetime string (`new Date(`${date}T${time}:00`).toISOString()`) before saving

Default time: **18:00** — the most common Hammarby kick-off time. User can change it.

### Time display in event list

Use the existing `formatDate(date, true)` helper which already produces `"10 apr 2026, 18:00"`. Apply it to both the Upcoming and Past event tables.

### Edit form in EventDrawer

The current edit form omits `eventDate`. Add date + time fields pre-populated from the existing event. On save, the existing `payload.eventDate = new Date(...).toISOString()` line already handles the conversion.

### Existing events without a time (00:00)

Events saved before this change will show `00:00`. Since no real events exist yet, this is acceptable. A display note ("—" for midnight) is not required.
