# Feature Specification: CMS Event ID

**Feature Branch**: `005-cms-event-id`
**Created**: 2026-04-10
**Status**: Draft
**Input**: Add a CMS Event ID field to events so that events can be linked to the external CMS. Staff can set the CMS ID manually in the UI. When an incoming submission carries a CMS Event ID, the system finds the matching event and auto-updates the CMS-sourced fields (name, date, competition, arena). Unrelated fields (press seat capacity, photo pit capacity) are never auto-updated. A "last updated" timestamp records when CMS fields were last synced.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Staff can view and set a CMS Event ID on any event (Priority: P1)

A staff member can see the CMS Event ID on an event in the event drawer, and can set or change it via the edit form. The field is optional — events without a CMS ID continue to work as before. The CMS ID is also available as an optional field when creating a new event from the Events page.

**Why this priority**: Before any auto-update logic can work in production, staff need a way to link existing events to their CMS counterparts. This UI work has zero risk and delivers immediate value.

**Independent Test**: Create a new event, set a CMS Event ID, save, and confirm it appears in the event drawer. Edit the event, change the CMS ID, save, and confirm the update is reflected.

**Acceptance Scenarios**:

1. **Given** a staff member opens the Add Event form, **When** they fill in the optional CMS Event ID field and save, **Then** the new event is created with that CMS Event ID stored.
2. **Given** a staff member opens an event drawer, **When** they view the event details, **Then** the CMS Event ID is shown (or shown as "—" if not set).
3. **Given** a staff member opens an event drawer and clicks Edit, **When** they change the CMS Event ID and save, **Then** the event is updated and the new value is shown in the drawer.
4. **Given** a staff member tries to set a CMS Event ID that is already assigned to another event, **When** they save, **Then** an error is shown and the ID is not saved.

---

### User Story 2 — Incoming submissions auto-update CMS-sourced event fields (Priority: P2)

When the system receives a submission that includes a CMS Event ID matching an existing event, it automatically updates the event's name, date, competition, and arena with the values from the submission. Fields that staff manage manually (press seat capacity, photo pit capacity) are never touched. A "last updated" timestamp is set on the event each time a sync happens.

**Why this priority**: This keeps event data in sync with the CMS without staff having to update events manually every time details change. Press seat and photo pit capacity are excluded because they are managed in-house, not by the CMS.

**Independent Test**: Create an event with a CMS Event ID. Send a POST to /api/submissions with that CMS Event ID and different event data (e.g., updated name). Confirm the event's name, date, competition, and arena are updated, while pressSeatsCapacity and photoPitCapacity are unchanged.

**Acceptance Scenarios**:

1. **Given** an event exists with a CMS Event ID, **When** a submission arrives with that same CMS Event ID and different event name/date/competition/arena, **Then** the event's name, date, competition, and arena are updated to the new values.
2. **Given** an event exists with a CMS Event ID and set press/photo pit capacity, **When** a submission arrives with that CMS Event ID, **Then** pressSeatsCapacity and photoPitCapacity are unchanged.
3. **Given** a submission arrives with a CMS Event ID that does not match any existing event, **When** the submission is processed, **Then** a new event is created with the submitted CMS Event ID and event fields.
4. **Given** an event is updated via a CMS submission, **When** a staff member views the event drawer, **Then** the "Last updated" timestamp reflects when the sync occurred.

---

### User Story 3 — Last updated timestamp visible in event drawer (Priority: P2)

The event drawer shows a "Last updated" line below the CMS Event ID, displaying when the event's CMS fields were last synced. Events that have never been synced show "—" for this field.

**Why this priority**: Staff need to know if event details are fresh or stale, especially as kick-off times can change close to match day.

**Independent Test**: After a CMS submission updates an event, open the event drawer and confirm the "Last updated" timestamp is visible and recent.

**Acceptance Scenarios**:

1. **Given** an event has been updated by an incoming submission, **When** a staff member views the event drawer, **Then** a "Last updated" row shows the date and time of the last sync.
2. **Given** an event has never been updated by a CMS submission, **When** a staff member views the event drawer, **Then** the "Last updated" row shows "—".

---

### Edge Cases

- What if a submission arrives with a CMS Event ID but no event name, date, or competition? Only include non-null fields from the submission when updating — do not overwrite existing data with empty values.
- What if two staff members try to assign the same CMS Event ID to different events simultaneously? The database unique constraint prevents this; the second save receives an error.
- What if a staff member clears the CMS Event ID on an event (sets it back to empty)? The field is set to null; the event still exists and can be linked again later.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Add Event form MUST include an optional "CMS Event ID" text field.
- **FR-002**: The Event drawer view MUST display the CMS Event ID (or "—" if not set).
- **FR-003**: The Event drawer edit form MUST allow staff to set or change the CMS Event ID.
- **FR-004**: Setting a CMS Event ID that is already assigned to another event MUST result in a clear error; the save MUST NOT proceed.
- **FR-005**: When a submission arrives with a CMS Event ID that matches an existing event, the event's `eventName`, `eventDate`, `competition`, and `arena` MUST be updated to the values from the submission.
- **FR-006**: `pressSeatsCapacity` and `photoPitCapacity` MUST NOT be modified by an incoming submission.
- **FR-007**: A `lastUpdatedAt` timestamp MUST be set on the event each time a CMS submission updates its fields.
- **FR-008**: The Event drawer MUST display a "Last updated" row showing `lastUpdatedAt` (date + time), or "—" if the event has never been synced.
- **FR-009**: Clearing a CMS Event ID (setting it to empty string or null) MUST be permitted and MUST store null in the database.

### Key Entities

- **Event**: existing entity; `cmsEventId String? @unique` already in schema; `lastUpdatedAt DateTime?` to be added.
- **Submission**: existing entity; the CMS webhook path already reads `cmsEventId` from the request body.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A CMS Event ID can be set, viewed, and edited on any event without errors.
- **SC-002**: Duplicate CMS Event ID assignments are rejected with a visible error message.
- **SC-003**: An incoming CMS submission that matches an existing event updates only the four CMS-sourced fields and sets `lastUpdatedAt`.
- **SC-004**: `pressSeatsCapacity` and `photoPitCapacity` are never changed by an incoming submission.
- **SC-005**: The Event drawer shows `lastUpdatedAt` for synced events and "—" for unsynced events.

## Assumptions

- `cmsEventId String? @unique` is already in `prisma/schema.prisma`; no migration needed for that field.
- `lastUpdatedAt DateTime?` does not yet exist in the schema; a Prisma migration is required.
- The CMS does not currently send `cmsEventId` with submissions (production is still on local sandbox); the auto-update logic should be implemented now but will not fire in practice until the CMS integration is enabled.
- Staff are the only users who set CMS Event IDs manually; no external system writes `cmsEventId` directly to the events table.
