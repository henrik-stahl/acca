# API Contract: Users

All endpoints require an authenticated session with Admin role. Non-admin requests return `403 Forbidden`.
These endpoints back the Team section of the Settings page.

---

## GET /api/users

Returns the list of all users.

**Auth**: Admin only

**Response 200**:
```json
[
  {
    "id": "cuid",
    "name": "Henrik Stahl",
    "email": "henrik@hammarbyfotboll.se",
    "image": "/uploads/avatars/abc.jpg",
    "role": "Admin",
    "status": "active",
    "invitedBy": null,
    "invitedAt": null
  }
]
```

---

## POST /api/users

Invite a new user. Creates a User record and sends an invitation email.

**Auth**: Admin only

**Request body**:
```json
{
  "email": "new.user@hammarbyfotboll.se",
  "role": "User"
}
```

**Validation**:
- `email` — required, valid email format, must not already exist in the DB
- `role` — required, must be `"Admin"` or `"User"`

**Response 201**:
```json
{
  "id": "cuid",
  "email": "new.user@hammarbyfotboll.se",
  "role": "User",
  "status": "invited",
  "invitedBy": "henrik@hammarbyfotboll.se",
  "invitedAt": "2026-04-10T10:00:00.000Z"
}
```

**Response 409**: Email already registered

**Response 400**: Validation error

---

## PUT /api/users/[id]

Update a user's role or status.

**Auth**: Admin only

**Request body** (partial — send only fields to change):
```json
{
  "role": "Admin",
  "status": "inactive"
}
```

**Validation**:
- Cannot set own account to `"inactive"`
- Cannot demote or deactivate the last Admin
- `role` must be `"Admin"` or `"User"` if provided
- `status` must be `"active"` or `"inactive"` if provided

**Response 200**: Updated user object

**Response 400**: Validation error (e.g., last admin protection)

**Response 403**: Attempting to modify own admin status

**Response 404**: User not found
