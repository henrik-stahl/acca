# Implementation Plan: CMS Event ID

**Branch**: `005-cms-event-id` | **Date**: 2026-04-10 | **Spec**: [spec.md](./spec.md)

## Summary

Add a CMS Event ID field to events: visible and editable in the UI, plus auto-update logic in the submissions webhook that refreshes CMS-sourced event fields when a matching CMS ID arrives. Also adds a `lastUpdatedAt` timestamp to track when an event was last synced from the CMS.

## Technical Context

**Language/Version**: TypeScript / Node.js 20
**Primary Dependencies**: Next.js 14 (App Router), React 18, Tailwind CSS, Prisma ORM + SQLite
**Testing**: `npm test && npm run lint`
**Target Platform**: Desktop web
**Constraints**: Minimal surface area — schema migration + 3 UI files + 2 API files

## Constitution Check

No project-specific gates. No violations.

## Existing Code Assessment

| File | Relevant state | Change needed |
|------|---------------|---------------|
| `prisma/schema.prisma` | `cmsEventId String? @unique` present; no `lastUpdatedAt` | ⚠️ Add `lastUpdatedAt DateTime?` + migration |
| `src/app/api/events/route.ts` | POST handles `cmsEventId`; no `lastUpdatedAt` | ✅ Minor: set `lastUpdatedAt` on create |
| `src/app/api/events/[id]/route.ts` | PUT does a blind `prisma.event.update(body)` | ⚠️ Catch unique constraint on `cmsEventId` → 409 |
| `src/app/api/submissions/route.ts` | Finds event by `cmsEventId`; creates if missing; does NOT update CMS fields | ⚠️ Add upsert-style update for CMS-sourced fields + `lastUpdatedAt` |
| `src/app/(app)/events/page.tsx` | Add form has no `cmsEventId` field | ⚠️ Add optional CMS ID input |
| `src/components/events/EventDrawer.tsx` | View and edit forms have no `cmsEventId` or `lastUpdatedAt` | ⚠️ Add both to view; add `cmsEventId` to edit form |

## Design Decisions

### Schema migration
Add `lastUpdatedAt DateTime?` to the `Event` model. Run `npx prisma migrate dev --name add-event-last-updated-at`.

### CMS ID in Add Event form
Add an optional text input labelled "CMS Event ID" below the Arena field. Same styling as existing text inputs.

### CMS ID in EventDrawer view
Add a `<DrawerRow label="CMS Event ID">` row below Arena, showing the value or "—". Add a `<DrawerRow label="Last updated">` row below CMS Event ID, showing `formatDate(event.lastUpdatedAt, true)` or "—".

### CMS ID in EventDrawer edit form
Add a text input for `cmsEventId` in the edit form below Arena. Clearing the field saves `null` (treat empty string as null before sending to API).

### Duplicate CMS ID error handling
The PUT endpoint currently does a blind `prisma.event.update(body)`. Wrap it in try/catch; if Prisma throws a `P2002` unique constraint error on `cmsEventId`, return `{ error: "CMS Event ID already in use" }` with status 409. The EventDrawer should show this message to the user.

### Auto-update CMS fields on submission
In `src/app/api/submissions/route.ts`, after finding an event by `cmsEventId`, add an `prisma.event.update` call to set `eventName`, `eventDate`, `competition`, `arena`, and `lastUpdatedAt = new Date()`. Only update fields that are present in the submission payload (guard each with a truthiness check so empty/null values don't overwrite existing data).

### `lastUpdatedAt` on create
When a new event is created via POST `/api/events`, set `lastUpdatedAt = new Date()` so the timestamp is meaningful from day one if the event was CMS-sourced. (If created manually, it still gets a timestamp but that's acceptable — it reflects when it was created rather than synced.)

Actually, reconsider: `lastUpdatedAt` should only be set when a CMS sync happens, so staff know whether the data is CMS-fresh or manually entered. Leave it null on manual creation and on the POST /api/events route. Only set it in the submissions webhook.

## Project Structure

### Documentation (this feature)

```text
specs/005-cms-event-id/
├── plan.md              ← this file
├── spec.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code

```text
prisma/schema.prisma                           ← add lastUpdatedAt
prisma/migrations/                             ← new migration
src/app/api/events/[id]/route.ts               ← catch P2002 → 409
src/app/api/submissions/route.ts               ← update CMS fields + lastUpdatedAt
src/app/(app)/events/page.tsx                  ← add cmsEventId to add form
src/components/events/EventDrawer.tsx          ← show + edit cmsEventId; show lastUpdatedAt
```
