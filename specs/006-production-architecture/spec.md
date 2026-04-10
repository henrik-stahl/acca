# Feature Specification: Production Architecture

**Feature Branch**: `006-production-architecture`
**Created**: 2026-04-10
**Status**: Draft

## Background

The app currently runs only on a developer's local machine against a local SQLite file. This feature moves it to a proper production deployment: a publicly accessible URL, a hosted database, cloud image storage, and a staging environment where changes can be verified before reaching real users. The GitHub repository will be made public, which requires a thorough audit to ensure no secrets or sensitive data are ever exposed.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — The app is live and accessible at a public URL (Priority: P0)

Staff can reach the app from any browser without running anything locally. The app behaves identically to the local version: login, submissions, events, contacts, settings all work. The database is hosted in the cloud and persists between deployments.

**Independent Test**: Open the production URL in an incognito browser, log in, create an event, reload the page — the event is still there.

**Acceptance Scenarios**:

1. **Given** a staff member navigates to the production URL, **When** the page loads, **Then** the login screen is shown and the app is fully functional.
2. **Given** a staff member creates a record (event, contact, or submission), **When** they reload or return later, **Then** the record persists — it was saved to the hosted database, not a local file.
3. **Given** a new commit is merged to `main`, **When** Vercel finishes deploying, **Then** the production app is updated automatically with no manual steps required.
4. **Given** the app is deployed, **When** an email notification is triggered (new submission, invitation), **Then** the email is delivered successfully using the production email credentials.

---

### User Story 2 — Profile images are stored in the cloud (Priority: P1)

Staff can upload profile pictures as before. Images are stored in cloud object storage (Vercel Blob) rather than the local filesystem, so they persist across deployments and are accessible from any server instance.

**Independent Test**: Upload a profile picture in production. Redeploy the app. The picture is still shown.

**Acceptance Scenarios**:

1. **Given** a staff member uploads a new profile picture, **When** they save, **Then** the image is stored in cloud object storage and the URL is saved to their profile.
2. **Given** a staff member uploads a new profile picture to replace an existing one, **When** the save completes, **Then** the old image is removed from storage and the new image is shown.
3. **Given** the app is redeployed, **When** a staff member views a profile, **Then** their profile picture is still shown (it was not stored on the server's local disk).

---

### User Story 3 — A staging environment exists for safe testing (Priority: P1)

There is a second deployment of the app — staging — that mirrors production but uses completely separate data. Staff can test new features, run through workflows, and verify changes in staging before they go live. Nothing done in staging affects production. Staging is password-protected so it is not publicly discoverable.

**Independent Test**: Open the staging URL. A password prompt appears. After entering the correct password, the app loads with a visible "STAGING" banner. Create a record — it does not appear in production.

**Acceptance Scenarios**:

1. **Given** someone navigates to the staging URL without the password, **When** the page loads, **Then** a password prompt is shown and the app is not accessible.
2. **Given** an authorised person enters the staging password, **When** they access the app, **Then** a persistent "STAGING" banner is visible so they always know they are not on production.
3. **Given** a record is created in staging, **When** a staff member checks production, **Then** the record does not exist there — staging and production have completely separate databases.
4. **Given** staging uses email features (invitations, notifications), **When** an email is triggered, **Then** it is captured by the test email service and not delivered to any real inbox.
5. **Given** a new commit is pushed to the `staging` branch, **When** Vercel finishes deploying, **Then** the staging app is updated automatically.

---

### User Story 4 — The GitHub repository is public with no secrets exposed (Priority: P0)

The source code is publicly visible on GitHub. No credentials, secrets, API keys, or personally identifiable information are committed to the repository — not in current files, not in git history (since the repository is new, history starts clean). All secrets are managed exclusively through environment variables in the deployment platform.

**Independent Test**: Clone the public repo. Search every file for known secret patterns (API keys, passwords, tokens). Run the app locally by providing your own `.env` — it works without any values being hardcoded.

**Acceptance Scenarios**:

1. **Given** the repository is made public, **When** any file is viewed on GitHub, **Then** no credentials, tokens, connection strings with passwords, or API keys are visible.
2. **Given** a developer clones the repo and creates their own `.env.local` with valid credentials, **When** they run `npm run dev`, **Then** the app starts and functions correctly — nothing sensitive is hardcoded.
3. **Given** the `.gitignore` is reviewed, **When** `git status` is run with a populated `.env` and `prisma/dev.db`, **Then** neither file appears as tracked or staged.
4. **Given** the production app is running, **When** environment variables are inspected, **Then** they are configured in the deployment platform dashboard — not in any committed file.

---

### User Story 5 — Per-PR preview deployments for rapid feedback (Priority: P2)

When a pull request is opened against `main` or `staging`, Vercel automatically deploys a preview of that branch to a unique URL. This lets changes be reviewed in a live environment without merging. Preview deployments use the staging database so no production data is touched.

**Independent Test**: Open a PR on GitHub. Vercel posts a preview URL as a PR comment. Visit the URL — the branch's changes are live and functional.

**Acceptance Scenarios**:

1. **Given** a pull request is opened, **When** Vercel builds the branch, **Then** a unique preview URL is posted to the PR.
2. **Given** a preview deployment is visited, **When** the app loads, **Then** it connects to the staging database (not production).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The production app MUST be deployed on Vercel (Pro plan) and auto-deploy on every push to `main`.
- **FR-002**: The staging app MUST be deployed on Vercel (Hobby plan) and auto-deploy on every push to the `staging` branch.
- **FR-003**: Both environments MUST use a hosted Turso (libSQL) database. The databases MUST be completely separate instances — no shared data.
- **FR-004**: Profile image uploads MUST be stored in Vercel Blob. Uploading a new image MUST delete the previous one.
- **FR-005**: The staging environment MUST be protected by a password prompt (HTTP basic auth via Next.js middleware). The password MUST be set via an environment variable.
- **FR-006**: The staging environment MUST display a persistent "STAGING" banner in the UI so users always know which environment they are in.
- **FR-007**: The production environment MUST use real SMTP credentials for email. The staging environment MUST use a test email service (Mailtrap) so no real emails are sent.
- **FR-008**: Preview deployments MUST be enabled for pull requests and MUST connect to the staging database.
- **FR-009**: The GitHub repository MUST contain no hardcoded secrets. All credentials MUST be supplied via environment variables.
- **FR-010**: A `.env.example` file MUST be committed to the repository listing every required environment variable with a description but no real values.

### Non-Functional Requirements

- **NFR-001**: All secrets previously in `.env` (NEXTAUTH_SECRET, SMTP credentials, etc.) MUST be removed from any committed file before the repository is made public.
- **NFR-002**: The `prisma/dev.db` file MUST remain in `.gitignore` and MUST NOT be committed.
- **NFR-003**: A new production database MUST be seeded with at least one Admin user so the app is functional immediately after first deploy.

---

## Key Entities / Scope

- **Environment variables**: `DATABASE_URL`, `DATABASE_AUTH_TOKEN` (Turso), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `SMTP_*` / `EMAIL_*`, `BLOB_READ_WRITE_TOKEN`, `STAGING_PASSWORD`
- **Infrastructure** (set up manually, outside codebase): Turso prod DB, Turso staging DB, Vercel prod project, Vercel staging project, Mailtrap account
- **Code changes**: Prisma client adapter (SQLite → libSQL/Turso), image upload API (filesystem → Vercel Blob), staging middleware, staging banner component, `.env.example`

## Out of Scope

- Custom domain configuration (deferred)
- CI/CD pipeline beyond Vercel's built-in GitHub integration
- Database backups and monitoring (deferred)
- Migrating existing local data (starting fresh in both environments)

---

## Success Criteria *(mandatory)*

- **SC-001**: A staff member can log in, create a record, and see it persist at the production URL.
- **SC-002**: A redeployment does not destroy or reset any data.
- **SC-003**: Uploading a new profile picture in production replaces the old one and survives a redeployment.
- **SC-004**: Staging is inaccessible without the correct password and shows a "STAGING" banner once authenticated.
- **SC-005**: No credentials appear anywhere in the public GitHub repository.
- **SC-006**: A developer can clone the repo and run the app locally by providing their own `.env.local` with no hardcoded values to hunt for.
- **SC-007**: Emails sent from staging are captured by Mailtrap and never reach a real inbox.

## Assumptions

- The Turso databases and Vercel projects are created manually by the developer before the code is deployed; this spec covers the code changes required, not the manual platform setup steps.
- The existing `prisma/schema.prisma` is SQLite-compatible; Turso's libSQL is wire-compatible with SQLite, so no schema changes are needed.
- Profile images are currently stored on the local filesystem and referenced by a relative path; this feature replaces that mechanism entirely.
- The production database starts empty; an initial Admin user will be created via a seed script or the first-run flow.
