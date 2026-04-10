# Research: User Accounts, Login Flow & User Management

## Session Expiry (24 hours)

**Decision**: Set `session.maxAge` to `86400` (24 × 60 × 60 seconds) in `authOptions` in `src/lib/auth.ts`.

**Rationale**: NextAuth's JWT strategy respects `maxAge` for both the JWT token and the session cookie. Setting it to 86400 gives a 24-hour inactivity window. NextAuth refreshes the token on each request, so "inactivity" means the user hasn't made any authenticated request in 24 hours.

**Alternatives considered**: Database session strategy — rejected because switching from JWT to DB sessions would require changing `session.strategy` and would break the existing `jwt`/`session` callbacks that propagate custom fields (role, phone, etc.) through the token.

```ts
// In authOptions:
session: {
  strategy: "jwt",
  maxAge: 24 * 60 * 60, // 24 hours
},
```

---

## Magic Link Expiry (10 minutes)

**Decision**: Set `maxAge` on the EmailProvider to `600` (10 × 60 seconds).

**Rationale**: NextAuth's EmailProvider accepts a `maxAge` option (in seconds) that controls `VerificationToken.expires`. The default is 24 hours — we want 10 minutes for security.

```ts
EmailProvider({
  maxAge: 10 * 60, // 10 minutes
  ...
})
```

---

## Replacing the Whitelist with DB-based Access Control

**Decision**: Remove the `WHITELIST` array. In the `signIn` callback, look up the user in the database and check that they exist and their `status` is not `"inactive"`.

**Rationale**: A hardcoded whitelist doesn't scale and can't be managed at runtime. Moving to DB-based checks allows admins to invite users, deactivate accounts, and manage access without code changes.

```ts
async signIn({ user }) {
  const dbUser = await prisma.user.findUnique({ where: { email: user.email ?? "" } });
  if (!dbUser) return false;                    // not invited/registered
  if (dbUser.status === "inactive") return false; // deactivated
  return true;
},
```

**Note**: The `PrismaAdapter` creates a User record on first sign-in. Since we're moving to invite-only, we must pre-create the User record during invitation. The `signIn` callback must reject users who don't have a pre-existing record.

---

## Invitation Flow

**Decision**: Admin POSTs to `/api/users` with `{ email, role }`. The API:
1. Creates a `User` record with `status: "invited"`, `role`, `invitedBy`, `invitedAt`
2. Calls `sendInvitationEmail(email)` which sends a custom email prompting the user to sign in via magic link

**Rationale**: NextAuth's magic link IS the activation mechanism — we don't need a separate activation token. The invitation email just explains context and links to the login page. When the invitee requests a magic link and signs in, the `signIn` callback finds their pre-created record (status: "invited") and allows access. On first successful sign-in, the PrismaAdapter sets `emailVerified` — we use this to flip status to "active" (handled via the `jwt` callback or a post-sign-in DB update).

**Alternatives considered**: Separate activation token — rejected as over-engineering; NextAuth already handles the secure one-time link mechanism.

---

## Preventing Last Admin Demotion/Deactivation

**Decision**: In the PUT `/api/users/[id]` handler, before applying a role change to "User" or a status change to "inactive", count active Admins. If the target is the last Admin, reject with 400.

```ts
if (newRole === "User" || newStatus === "inactive") {
  const adminCount = await prisma.user.count({
    where: { role: "Admin", status: { not: "inactive" }, id: { not: id } }
  });
  if (adminCount === 0) return 400 "Cannot demote or deactivate the last admin";
}
```

---

## Role Enforcement in Middleware

**Decision**: Extend the existing `withAuth` middleware to check for the `Admin` role on the `/users` route by reading from the JWT token.

**Rationale**: NextAuth's `withAuth` accepts an `authorized` callback that receives the token. We can check `token?.role === "Admin"` for admin-only routes.

```ts
export default withAuth({
  callbacks: {
    authorized({ token, req }) {
      if (req.nextUrl.pathname.startsWith("/users")) {
        return token?.role === "Admin";
      }
      return !!token;
    },
  },
  pages: { signIn: "/login" },
});
```

---

## Deactivated User Mid-Session (FR-018)

**Decision**: Check user `status` in the `session` callback on every authenticated request, not only in `signIn`.

**Rationale**: NextAuth's JWT strategy cannot revoke tokens once issued. A deactivated user with an active JWT can continue making requests until it expires (up to 24h). Checking status in the `session` callback means the next request after deactivation will return no session, redirecting the user to login.

```ts
async session({ session, token }) {
  // Re-check status on every request
  const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } });
  if (!dbUser || dbUser.status === "inactive") {
    return { ...session, user: undefined }; // effectively kills the session
  }
  // ... rest of session mapping
}
```

**Note**: This adds one DB query per request. For a small team (~20 users) this is negligible. A Redis blocklist would be faster at scale but is unnecessary here.

---

## Next.js Security Update (CVE-2025-29927)

**Decision**: Update Next.js from 14.2.4 to 14.2.25 before implementing any auth changes.

**Rationale**: CVE-2025-29927 is a critical (CVSS 9.1) middleware authorization bypass — an attacker can craft requests that skip middleware entirely, bypassing all auth checks. Since our auth relies heavily on middleware, this must be patched first.

---

## Status Transition on First Sign-in

**Decision**: In the `jwt` callback, after a successful sign-in (`user` is populated), if `user.status === "invited"`, update the DB record to `status: "active"`.

```ts
if (user && (user as any).status === "invited") {
  await prisma.user.update({
    where: { id: user.id },
    data: { status: "active" }
  });
}
```
