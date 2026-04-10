# Feature Specification: User Accounts, Login Flow & User Management

**Feature Branch**: `001-user-auth-login`
**Created**: 2026-04-10
**Status**: Draft
**Input**: User description: "User accounts, user management, and login flow for Acca"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log in to Acca (Priority: P1)

A Hammarby Fotboll staff member needs to log in to Acca to manage press accreditations. They visit the login page, enter their email address, receive a magic link by email, and click it to gain access. The session persists until they log out or it expires.

**Why this priority**: Without a working login flow, no other part of the system is accessible. This is the entry point for all users.

**Independent Test**: Can be fully tested by navigating to the login page, submitting an email, and verifying that a magic link is received and grants access to the app.

**Acceptance Scenarios**:

1. **Given** a user with a registered account visits the login page, **When** they enter their email and submit, **Then** they receive an email containing a magic link within 60 seconds.
2. **Given** a user has received a magic link, **When** they click it, **Then** they are redirected to the Acca dashboard and are authenticated.
3. **Given** a user is already logged in, **When** they visit the login page, **Then** they are redirected to the dashboard.
4. **Given** a user enters an email that is not registered, **When** they submit, **Then** they see an error message indicating no account was found for that email.
5. **Given** a magic link has already been used or has expired, **When** a user clicks it, **Then** they see a clear error message and are prompted to request a new link.

---

### User Story 2 - Manage own profile (Priority: P2)

A logged-in user can view and update their own profile — including their display name, phone number, and profile picture — so that the information visible to their colleagues in Acca is accurate.

**Why this priority**: Profile self-management reduces admin burden and keeps contact information current. It does not block any core accreditation workflows.

**Independent Test**: Can be fully tested by navigating to the profile settings page, updating a field, saving, and verifying the change is reflected immediately.

**Acceptance Scenarios**:

1. **Given** a logged-in user navigates to their profile, **When** they update their name and save, **Then** the new name is shown throughout the app.
2. **Given** a logged-in user uploads a profile picture, **When** the upload completes, **Then** their avatar is updated and visible in the navigation.
3. **Given** a logged-in user updates their phone number, **When** they save, **Then** the new number is persisted and shown on their profile.

---

### User Story 3 - Invite and manage users (Priority: P3)

An administrator can invite new users to Acca by email, assign them a role, and later edit or deactivate their accounts. This ensures only authorised staff can access the system.

**Why this priority**: Required for controlled onboarding of new staff but does not block day-to-day accreditation work, since existing users can continue operating.

**Independent Test**: Can be fully tested by an admin sending an invitation email, the invitee accepting and setting up their account, and the admin verifying the new user appears in the user list with the correct role.

**Acceptance Scenarios**:

1. **Given** an admin is on the User Management page, **When** they enter an email address and select a role and send the invitation, **Then** the invitee receives an email with a link to activate their account.
2. **Given** an invitee clicks their activation link, **When** they complete account setup, **Then** their account becomes active and they can log in.
3. **Given** an admin is viewing the user list, **When** they change a user's role, **Then** the change takes effect immediately and the user's access is updated.
4. **Given** an admin deactivates a user, **When** that user attempts to log in, **Then** they are denied access and shown an appropriate message.
5. **Given** an admin is viewing the user list, **When** they search or filter by name or role, **Then** the list updates to show only matching users.

---

### Edge Cases

- What happens if a magic link is clicked from a different device or browser than where it was requested?
- What if the same email address is invited twice before the first invitation is accepted?
- What if an admin deactivates their own account? (Should be prevented.)
- What if a user's email provider delays or blocks the magic link email?
- What if a session expires mid-use — does the user lose unsaved work?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to request a magic link by entering their registered email address on the login page.
- **FR-002**: The system MUST send a magic link email to the user within 60 seconds of a valid request.
- **FR-003**: Magic links MUST expire after a reasonable period of inactivity (assumed: 10 minutes).
- **FR-004**: Magic links MUST be single-use and invalidated after first use.
- **FR-005**: The system MUST redirect authenticated users who visit the login page directly to the dashboard.
- **FR-006**: The system MUST redirect unauthenticated users who visit any protected page to the login page.
- **FR-007**: Users MUST be able to view and edit their own display name, phone number, and profile picture from a profile settings page.
- **FR-008**: Profile picture uploads MUST be validated for file type and size before saving.
- **FR-009**: Administrators MUST be able to invite new users by email address, assigning them a role at time of invitation.
- **FR-010**: The system MUST send an invitation email with an account activation link when an admin creates a new user.
- **FR-011**: Administrators MUST be able to change the role of any non-admin user.
- **FR-012**: Administrators MUST be able to deactivate user accounts, preventing further login.
- **FR-013**: The system MUST prevent an admin from deactivating their own account.
- **FR-014**: The User Management page MUST display a list of all users including their name, email, role, and account status.
- **FR-015**: Users MUST be able to log out, immediately ending their session.
- **FR-017**: Sessions MUST expire automatically after 24 hours of inactivity, logging the user out and requiring re-authentication.
- **FR-016**: The system MUST support exactly two roles: Admin and User. Admins have full access to all features including User Management. Users have full access to all accreditation features (submissions, events, contacts) but cannot access User Management or change other users' roles.

### Key Entities

- **User**: A staff member with access to Acca. Has a display name, email address, phone number, profile picture, role, and account status (active/inactive).
- **Role**: Defines what actions a user can perform in the system. At minimum: Admin and a standard user role.
- **Session**: Represents an authenticated login. Tied to a user, has an expiry time.
- **Invitation**: A pending account creation request sent to an email address by an admin. Has an expiry and a single-use activation token.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can complete the full login flow (enter email → receive link → gain access) in under 2 minutes.
- **SC-002**: An admin can invite a new user and have them fully onboarded (invitation sent, account activated, first login) in under 5 minutes.
- **SC-003**: Unauthenticated access to any protected page is blocked 100% of the time.
- **SC-004**: Deactivated users are denied access 100% of the time, including sessions that were active at the time of deactivation.
- **SC-005**: A user can update their profile and see changes reflected immediately without a page reload.

---

## Assumptions

- Authentication is passwordless — users log in exclusively via magic links sent to their registered email address. No password-based login is supported.
- Only administrators can create new user accounts; self-registration is not supported.
- At least one admin account must exist at all times; the system will prevent the last admin from being deactivated or demoted.
- Email delivery relies on an external email provider (e.g., SMTP or transactional email service); delivery failures are outside the scope of this feature but should surface a clear user-facing error.
- Sessions expire after 24 hours of inactivity, at which point the user is automatically logged out and must authenticate again via magic link.
- Profile pictures are stored server-side; the feature does not rely on any third-party avatar service.
- Mobile responsiveness of login and profile pages is in scope; the User Management page is desktop-only for v1.
