# Feature Specification: Event Kick-off Time

**Feature Branch**: `002-event-time`  
**Created**: 2026-04-10  
**Status**: Draft  
**Input**: User description: "Add kick-off time to events — the event creation form should let any logged-in user set a time alongside the date, and that time should be stored, displayed in the event list, and shown on the event detail/export."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Set kick-off time when creating an event (Priority: P1)

When a staff member creates a new event, they fill in both a date and a time for the kick-off. The system stores the full date and time together. This ensures scheduled events are unambiguously identified and downstream communications (accreditation emails, exports) reflect the correct kick-off time.

**Why this priority**: Without a time, events on the same date are ambiguous, and exported accreditation documents will show incomplete information. This is the core of the feature.

**Independent Test**: Can be fully tested by creating a new event with a date and time, then verifying the stored event shows the correct date and time.

**Acceptance Scenarios**:

1. **Given** a logged-in user is on the Events page, **When** they open the Add event form and enter a date and a time, **Then** the event is saved with both the date and time stored correctly.
2. **Given** a logged-in user submits the Add event form without entering a time, **When** they attempt to save, **Then** the form prevents submission and indicates that kick-off time is required.
3. **Given** a logged-in user enters a valid date and time, **When** the event is saved, **Then** the time is stored and survives a page reload without loss.

---

### User Story 2 - See kick-off time in the event list (Priority: P2)

When a staff member views the list of upcoming or past events, each event row shows its kick-off time alongside the date so they can distinguish events at a glance without opening them.

**Why this priority**: The list is the primary way staff monitors the schedule. Without time, two events on the same day are indistinguishable in the list.

**Independent Test**: Can be tested independently by checking that the event list displays both date and time for each event row.

**Acceptance Scenarios**:

1. **Given** events exist with kick-off times, **When** a user views the Upcoming or Past events list, **Then** each event row displays both the date and the time in a readable format.
2. **Given** an event was created before this feature (with no time stored), **When** a user views the list, **Then** the event row shows the date and a clear indicator that no time is set (e.g., "—") rather than showing an error or empty field.

---

### User Story 3 - Kick-off time appears in exported documents (Priority: P3)

When a staff member exports an event's accreditation list (e.g., to Excel), the kick-off time is included alongside the date so the exported document is complete and accurate.

**Why this priority**: Exports are used as official documents. Including the time avoids manual edits after export, but the feature is still usable without this if needed.

**Independent Test**: Can be tested by exporting an event's accreditation list and verifying the date and time appear in the export.

**Acceptance Scenarios**:

1. **Given** an event with a kick-off time exists, **When** a user exports the accreditation list, **Then** the exported file includes the date and time.

---

### Edge Cases

- What happens when an existing event has no time stored? The system should display a neutral placeholder (e.g., "—") rather than an error, and allow the event to be edited to add a time.
- What time zone is used? Kick-off times are treated as local Swedish time (Europe/Stockholm) — no time zone conversion is needed within the app.
- What if the user enters only a date and skips the time field on a new event? Submission is blocked; both fields are required for new events.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The event creation form MUST include a required kick-off time field alongside the existing date field.
- **FR-002**: The system MUST store the kick-off time as part of the event record, combined with the date into a single date-time value.
- **FR-003**: The event list (both Upcoming and Past sections) MUST display the kick-off time alongside the date for each event.
- **FR-004**: The event creation form MUST prevent submission if the kick-off time field is empty.
- **FR-005**: Any logged-in user (regardless of role) MUST be able to set the kick-off time when creating or editing an event.
- **FR-006**: Existing events without a stored time MUST remain accessible and display a neutral placeholder where the time would appear, rather than causing an error.
- **FR-007**: The kick-off time MUST be included in any event export or accreditation list generated from that event.

### Key Entities

- **Event**: Existing entity. The `eventDate` field currently stores a date-only value; after this change it will store a full date-time value (date + kick-off time).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can create an event with a kick-off time in under 60 seconds using the Add event form.
- **SC-002**: 100% of newly created events display their kick-off time in the event list without additional steps.
- **SC-003**: All event exports generated after this change include the kick-off time.
- **SC-004**: Existing events created before this change continue to load and display without errors, showing a placeholder for the missing time.

## Assumptions

- Kick-off times are always in Swedish local time (Europe/Stockholm); no multi-timezone support is needed.
- Both the date and time fields are required for new events; there is no use case for a timeless event going forward.
- Editing an existing event to add or change the time is in scope (inline edit on the event detail).
- The `eventDate` database field already stores a DateTime type, so no schema migration is needed — only the form input and display logic need updating.
- Mobile and responsive layout are not a focus; the app is used on desktop.
- All logged-in users (Admin and User roles) have equal access to create and edit events.
