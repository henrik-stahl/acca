# Feature Specification: Dashboard Improvements

**Feature Branch**: `003-dashboard`
**Created**: 2026-04-10
**Status**: Draft
**Input**: User description: "Add a Rejected summary card. Reorder summary cards to Total, Approved, Rejected, Pending. Replace the pie chart in the Submissions box with a plain ranked leaderboard (event name + count, no percentages) and rename it to Submissions leaderboard. Keep the No-show leaderboard. Add an Attendance leaderboard showing total attended and approved per contact, same format as the No-show leaderboard."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Summary cards show all four key statuses in the correct order (Priority: P1)

A staff member opens the Dashboard and sees four summary cards at the top — Total submissions, Approved, Rejected, and Pending — in that order. This gives an instant overview of the current accreditation pipeline without having to navigate elsewhere.

**Why this priority**: The summary cards are the first thing a user sees. Adding Rejected and fixing the order completes the picture and avoids confusion about where rejected submissions have gone.

**Independent Test**: Navigate to the Dashboard and confirm four cards appear in the order: Total submissions, Approved, Rejected, Pending, each showing the correct count.

**Acceptance Scenarios**:

1. **Given** submissions exist with various statuses, **When** a user opens the Dashboard, **Then** four summary cards are displayed in the order: Total submissions, Approved, Rejected, Pending.
2. **Given** no submissions exist, **When** a user opens the Dashboard, **Then** all four cards display 0.
3. **Given** the number of rejected submissions changes, **When** a user reloads the Dashboard, **Then** the Rejected card reflects the updated count.

---

### User Story 2 — Submissions leaderboard shows events ranked by submission count (Priority: P2)

A staff member can see which events have received the most accreditation submissions, presented as a simple ranked list with event name and submission count. There are no pie charts or percentages.

**Why this priority**: The pie chart is hard to read and less useful than a ranked list. A leaderboard immediately shows which events are busiest.

**Independent Test**: With submissions spread across multiple events, open the Dashboard and confirm a ranked list appears showing event names and counts with no pie chart.

**Acceptance Scenarios**:

1. **Given** submissions exist across multiple events, **When** a user opens the Dashboard, **Then** a ranked list of events is shown, ordered from most to fewest submissions, each row showing rank, event name, and submission count.
2. **Given** the submissions leaderboard section exists, **When** a user looks at it, **Then** no pie chart or percentage values are present.
3. **Given** no submissions exist, **When** a user opens the Dashboard, **Then** the Submissions leaderboard shows an empty state message.
4. **Given** the section is present, **When** a user reads the heading, **Then** it reads "Submissions leaderboard".

---

### User Story 3 — Attendance leaderboard shows contacts ranked by attended count (Priority: P3)

A staff member can see which accredited contacts have attended the most events, shown as a ranked list with their name, number of times attended, and number of approved accreditations — mirroring the format of the existing No-show leaderboard.

**Why this priority**: Attendance data is as valuable as no-show data. Knowing who shows up most frequently helps staff recognise reliable press contacts.

**Independent Test**: With at least one contact who has attended an approved submission, open the Dashboard and confirm the Attendance leaderboard shows that contact with their attended and approved counts.

**Acceptance Scenarios**:

1. **Given** contacts exist with attended approved submissions, **When** a user opens the Dashboard, **Then** an Attendance leaderboard is shown, ranked by attended count (highest first).
2. **Given** a contact has attended events, **When** their row is displayed, **Then** it shows their name, attended count (prominently), and approved count in a secondary line — matching the format of the No-show leaderboard.
3. **Given** no attended submissions exist, **When** a user opens the Dashboard, **Then** the Attendance leaderboard shows an empty state message.

---

### Edge Cases

- What if two events have the same submission count in the Submissions leaderboard? They are shown in the order they appear after sorting (stable sort); no tiebreaker is required.
- What if a contact has 0 attended submissions? They are excluded from the Attendance leaderboard.
- What if there are more than 10 entries in any leaderboard? Show only the top 10.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Dashboard MUST display four summary cards in the order: Total submissions, Approved, Rejected, Pending.
- **FR-002**: Each summary card MUST show the correct count based on current submission data.
- **FR-003**: The existing pie chart MUST be removed from the Dashboard.
- **FR-004**: A "Submissions leaderboard" section MUST display events ranked by total submission count, showing rank, event name, and count per row.
- **FR-005**: The Submissions leaderboard MUST NOT display percentages.
- **FR-006**: The Submissions leaderboard MUST show a maximum of 15 events.
- **FR-007**: The No-show leaderboard MUST remain unchanged.
- **FR-008**: An "Attendance leaderboard" section MUST display contacts ranked by attended count (highest first), showing name, attended count, and approved count per row.
- **FR-009**: The Attendance leaderboard MUST show a maximum of 5 contacts.
- **FR-010**: Both the Submissions leaderboard and Attendance leaderboard MUST show an appropriate empty state when no data is available.

### Key Entities

- **Submission**: existing entity; fields used are `status`, `attended`, `eventId`, `accreditedId`, and the related `event.eventDate` (to determine if a past event counts as a no-show).
- **Contact**: existing entity; identified via `accreditedId` on submissions; name derived from `firstName` + `lastName`.
- **Event**: existing entity; identified via `eventId` on submissions; name from `eventName`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All four summary cards are visible and correctly labelled on every Dashboard load.
- **SC-002**: The Submissions leaderboard renders in under 1 second with up to 500 submissions.
- **SC-003**: No pie chart or chart library rendering appears on the Dashboard.
- **SC-004**: The Attendance leaderboard shows the correct top-10 contacts ranked by attended count.
- **SC-005**: Both new leaderboards display an empty state when there is no relevant data.

## Assumptions

- All data is derived from the existing `/api/submissions` endpoint; no new API endpoints are needed.
- The Recharts library import can be removed entirely once the pie chart is gone.
- The layout of the leaderboards section remains two columns (Submissions leaderboard on the left, No-show and Attendance leaderboards stacked on the right — or another sensible arrangement).
- All leaderboards show a maximum of 10 entries.
- Contacts with zero attendance are excluded from the Attendance leaderboard.
