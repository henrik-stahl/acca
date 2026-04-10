# Implementation Plan: User Accounts, Login Flow & User Management

**Branch**: `001-user-auth-login` | **Date**: 2026-04-10 | **Spec**: [spec.md](./spec.md)

## Summary

Extend the existing NextAuth magic link authentication to support proper user account lifecycle management: 24-hour session expiry, database-driven access control (replacing the hardcoded whitelist), user invitation flow, role enforcement (Admin/User), and a User Management page for admins.

The majority of the auth infrastructure already exists and is working. This plan covers only the delta — what needs to be added or modified.

## Technical Context

**Language/Version**: TypeScript / Node.js 20, Next.js 14 (App Router)
**Primary Dependencies**: NextAuth v4, Prisma ORM, nodemailer (SMTP/Gmail), React 18, Tailwind CSS
**Storage**: SQLite (via Prisma, file-based, development) — same DB as existing app
**Testing**: Manual verification (no automated test suite currently in place)
**Target Platform**: Web — desktop primary, login page mobile-responsive
**Project Type**: Web application (full-stack Next.js)
**Performance Goals**: Standard web app expectations — no special throughput requirements
**Constraints**: Must not break existing working auth or any other page; zero downtime migration
**Scale/Scope**: Small team (~5–20 users); no multi-tenancy

## Constitution Check

The project constitution is currently a template with no project-specific rules ratified. No gate violations to evaluate. This plan follows general best practices: minimal changes to working code, additive schema migration, no unnecessary abstractions.

## Existing Code Assessment

The following already works and **must not be broken**:

| File | Status | Action |
|------|--------|--------|
| `package.json` | ⚠️ Outdated | Update Next.js from 14.2.4 → 14.2.25 (CVE-2025-29927 critical security fix) |
| `src/lib/auth.ts` | ✅ Working | Modify — add session maxAge, replace whitelist with DB lookup, add status check in session callback |
| `src/app/login/page.tsx` | ✅ Working | No changes |
| `src/app/api/auth/[...nextauth]/route.ts` | ✅ Working | No changes |
| `src/app/api/user/profile/route.ts` | ✅ Working | No changes |
| `src/app/api/user/avatar/route.ts` | ✅ Working | No changes |
| `src/middleware.ts` | ✅ Working | No changes needed |
| `src/app/(app)/settings/page.tsx` | ✅ Working | Modify — add Team section below profile (Admin only) |
| `src/components/layout/Sidebar.tsx` | ✅ Working | No changes needed |
| `prisma/schema.prisma` | ✅ Working | Modify — additive fields only |

## Project Structure

### Documentation (this feature)

```text
specs/001-user-auth-login/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── users-api.md     ← Phase 1 output
└── tasks.md             ← Phase 2 output (speckit-tasks)
```

### Source Code Changes

```text
prisma/
└── schema.prisma                          MODIFY — add status, invitedBy, invitedAt to User

src/
├── lib/
│   ├── auth.ts                            MODIFY — session maxAge, DB-based signIn check
│   └── mailer.ts                          MODIFY — add sendInvitationEmail()
├── app/
│   ├── (app)/
│   │   └── settings/
│   │       └── page.tsx                   MODIFY — add Team section (inline user table, Admin only)
│   └── api/
│       └── users/
│           ├── route.ts                   CREATE — GET (list), POST (invite)
│           └── [id]/
│               └── route.ts              CREATE — PUT (update role/status)
```

## Migration Notes

- After applying the schema migration, run a seed script to upsert the three existing whitelisted users as `status: "active"`, `role: "Admin"` records. This ensures they can log in immediately after the whitelist is removed.
- Existing `User` records created by NextAuth (if any) should be updated to `status: "active"` to avoid locking anyone out.

## Complexity Tracking

No constitution violations. No added complexity beyond what the spec requires.
