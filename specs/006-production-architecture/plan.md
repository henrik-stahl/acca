# Implementation Plan: Production Architecture

**Branch**: `006-production-architecture` | **Date**: 2026-04-10 | **Spec**: [spec.md](./spec.md)

## Summary

Move the app from a local-only SQLite setup to a production-ready deployment: Turso for hosted database, Vercel Blob for image storage, a seed script for the first admin user, and a staging environment complete with password protection and a visible banner. The GitHub repository is audited for secrets before going public and a `.env.example` documents every required variable.

## Technical Context

**Language/Version**: TypeScript / Node.js 20
**Primary Dependencies**: Next.js 14 (App Router), Prisma ORM, NextAuth v4, Tailwind CSS
**New Dependencies**: `@libsql/client`, `@prisma/adapter-libsql`, `@vercel/blob`
**Testing**: `npm test && npm run lint`
**Constraints**: Turso is wire-compatible with SQLite — no schema or migration changes needed

## Manual Setup Steps (outside the codebase)

These must be completed by the developer before the first deploy. They are not automated by code:

1. **Turso**: Create two databases (`acca-prod`, `acca-staging`) via the Turso CLI or dashboard. Note the URL and auth token for each.
2. **Vercel**: Create two projects (`acca-prod`, `acca-staging`), each connected to the GitHub repo on the `main` and `staging` branches respectively.
3. **Vercel Blob**: Create a Blob store in the Vercel dashboard. Copy the `BLOB_READ_WRITE_TOKEN` to both project's environment variables.
4. **Mailtrap**: Create a free account, copy the SMTP credentials for the staging project's environment variables.
5. **Vercel environment variables**: Set all variables from `.env.example` in each project's dashboard (prod and staging values differ for `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `NEXTAUTH_URL`, `SMTP_*`, `STAGING_PASSWORD`, `NEXT_PUBLIC_ENVIRONMENT`).
6. **First deploy**: After deploying, run `npx prisma db push` then `npm run db:seed` against the production Turso database to create the schema and the first admin user.

---

## Code Changes

### Existing Code Assessment

| File | Current state | Change needed |
|------|--------------|---------------|
| `prisma/schema.prisma` | `provider = "sqlite"`, no driverAdapters | ⚠️ Add `previewFeatures = ["driverAdapters"]` |
| `src/lib/prisma.ts` | Standard `new PrismaClient()` | ⚠️ Use libSQL adapter when `DATABASE_AUTH_TOKEN` is set |
| `src/app/api/user/avatar/route.ts` | Writes to local filesystem via `fs.writeFile` | ⚠️ Replace with Vercel Blob `put()` + `del()` |
| `src/middleware.ts` | `withAuth` from next-auth only | ⚠️ Add staging password check before auth |
| `src/app/(app)/layout.tsx` | App shell layout | ⚠️ Add `<StagingBanner />` |
| `prisma/seed.ts` | Does not exist (command is wired in package.json) | ⚠️ Create with idempotent admin user creation |
| `.env.example` | Does not exist | ⚠️ Create listing all variables |
| `.env` | Has `DATABASE_URL=file:./dev.db` — not sensitive | ✅ Already in `.gitignore`, no action needed |

---

## Design Decisions

### Turso adapter: conditional by environment

`src/lib/prisma.ts` will use the libSQL adapter only when `DATABASE_AUTH_TOKEN` is present. When it is absent (local development), the `createClient` call still uses `DATABASE_URL=file:./prisma/dev.db`, which the libSQL client supports natively. This means **local development continues to work with the existing SQLite file** — no developer needs a Turso account to run the app locally.

```ts
// Pseudocode
if (DATABASE_AUTH_TOKEN) {
  // Turso: use libSQL adapter
  const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN })
  prisma = new PrismaClient({ adapter: new PrismaLibSQL(client) })
} else {
  // Local: standard file-based SQLite
  prisma = new PrismaClient()
}
```

The `previewFeatures = ["driverAdapters"]` must be added to the Prisma generator block and `prisma generate` must be re-run.

### Vercel Blob: delete-on-replace

The avatar upload route (`POST /api/user/avatar`) will:
1. Read the user's current `image` URL from the database
2. Upload the new file with `put(filename, buffer, { access: "public" })`
3. If step 1 returned a Blob URL, call `del(oldUrl)` to remove the old file
4. Update the user's `image` field with the new Blob URL

For local development without `BLOB_READ_WRITE_TOKEN`, the upload route will return a 501 with a clear message ("Image upload requires BLOB_READ_WRITE_TOKEN"). This is acceptable — local dev doesn't need avatar uploads to work.

### Staging password protection

The current `src/middleware.ts` uses `withAuth` from next-auth. We will replace it with a custom middleware function that:
1. If `STAGING_PASSWORD` is set **and** the request path is not a NextAuth callback, check for an `Authorization: Basic` header. The expected value is `Basic base64("staging:<STAGING_PASSWORD>")` — the username field is ignored, only the password is checked.
2. If the header is missing or wrong, respond with `401` and `WWW-Authenticate: Basic realm="Staging"`. This triggers the browser's built-in login prompt.
3. If the check passes (or `STAGING_PASSWORD` is not set), fall through to the existing NextAuth protection.

NextAuth callback paths (`/api/auth/*`) and the login page (`/login`) must be exempt from the staging check to avoid an auth loop.

### STAGING banner

A new `src/components/layout/StagingBanner.tsx` server component that renders only when `process.env.NEXT_PUBLIC_ENVIRONMENT === "staging"`. It is a fixed amber bar at the very top of the viewport, above the app chrome, with the text "STAGING — changes here do not affect production". Added to `src/app/(app)/layout.tsx`.

### Seed script

`prisma/seed.ts` reads `SEED_ADMIN_EMAIL` (required) and `SEED_ADMIN_NAME` (optional, defaults to `"Admin"`) from `process.env`. It checks whether a user with that email already exists; if so it exits without changes (idempotent). If not, it creates an `active` Admin user. Run once after first deploy with `npm run db:seed`.

### `.env.example`

A committed file documenting every variable the app needs. Real values are never included — only placeholder descriptions. This is the developer's guide to setting up a new environment.

---

## Project Structure

```text
specs/006-production-architecture/    ← this feature's docs
prisma/seed.ts                        ← new: first admin user
prisma/schema.prisma                  ← add previewFeatures
src/lib/prisma.ts                     ← conditional libSQL adapter
src/app/api/user/avatar/route.ts      ← filesystem → Vercel Blob
src/middleware.ts                     ← add staging password check
src/components/layout/StagingBanner.tsx  ← new
src/app/(app)/layout.tsx              ← add <StagingBanner />
.env.example                          ← new
```
