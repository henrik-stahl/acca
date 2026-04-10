# Data Model: User Accounts, Login Flow & User Management

## Changes to Existing Schema

Only the `User` model is modified. All other models are unchanged.

### User (modified)

```prisma
model User {
  id                   String    @id @default(cuid())
  name                 String?
  email                String?   @unique
  emailVerified        DateTime?
  image                String?

  // Existing fields — unchanged
  phone                String?
  notifyNewSubmissions Boolean   @default(true)

  // MODIFIED: default changed from "Admin" to "User"
  role                 String    @default("User")   // "Admin" | "User"

  // NEW fields
  status               String    @default("active") // "active" | "invited" | "inactive"
  invitedBy            String?                      // email of the inviting admin
  invitedAt            DateTime?                    // when the invitation was sent

  accounts             Account[]
  sessions             Session[]
}
```

### Migration notes

- `status` defaults to `"active"` — existing users are automatically active after migration
- `role` default changes from `"Admin"` to `"User"` — **only affects new users created after migration**; existing users retain their current role
- `invitedBy` and `invitedAt` are nullable — existing users have no invitation history, which is fine

## Status State Machine

```
[admin invites]  →  "invited"
"invited"        →  "active"    (on first successful sign-in)
"active"         →  "inactive"  (admin deactivates)
"inactive"       →  "active"    (admin reactivates)
```

Constraints:
- A user with status `"inactive"` cannot sign in
- The last Admin cannot be set to `"inactive"` or demoted to `"User"`
- An admin cannot deactivate their own account

## Role Definitions

| Role | Access |
|------|--------|
| Admin | All pages including `/users` (User Management) |
| User | All accreditation pages (submissions, events, contacts, dashboard, settings) — no `/users` |
