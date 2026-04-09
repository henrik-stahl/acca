# Acca — Project Context
*Press accreditation management tool for Hammarby Fotboll*

## What is Acca?
Acca replaces Hammarby Fotboll's current press accreditation workflow (website form → email inbox → manual handling) with a structured admin tool. It is an internal tool owned by the Marketing & Communications department.

The working name is **Acca**. Henrik (Hank) is the sole internal owner and primary user.

---

## Where the code lives
- **Local:** `~/Desktop/acca`
- **Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS v3, Prisma, SQLite (dev) → PostgreSQL (prod)
- **To run locally:** `cd ~/Desktop/acca` → `npm run dev` → opens at `http://localhost:3000`
- **Database:** already set up. Never run `db:push` or `db:seed` again unless explicitly resetting.

---

## Data schema (finalised)

### Contact
`contact_id` (CID00001), `created_at`, `first_name`, `last_name`, `email` (primary dedup key), `company`, `role`, `work_phone`, `cell_phone`, `comments` (JSON array)

**Deduplication rule:** email + first_name + last_name must all match to treat as existing contact. Any mismatch = new record.

### Event
`event_id` (EID00001), `created_at`, `event_name`, `event_date`, `competition`, `arena`, `press_seats_capacity`, `photo_pit_capacity`, `cms_event_id` (from Hammarby CMS, prevents duplicates)

Events are created automatically from form submissions — not manually. The `cms_event_id` field prevents duplicate event records.

### Submission
`submission_id` (SID00001), `created_at`, `event_id` (FK), `applicant_id` (FK → Contact), `accredited_id` (FK → Contact), `company`, `phone`, `category` (Press/Foto/Radio/TV/Webb/Annat), `press_card` (AIPS-kort/Annat presskort/Kort saknas), `other_notes`, `status`, `info_request_message`, `status_updated_at`, `email_sent_to`

A Submission connects one Event to two Contacts: the **applicant** (person who submitted the form) and the **accredited individual** (person attending). These can be the same person.

### Status lifecycle
```
Pending → Approved          (email to applicant + accredited)
Pending → Rejected          (email to applicant + accredited)
Pending → Info requested    (email with custom message to applicant + accredited)
Info requested → Pending    (on resubmission)
Info requested → Approved
Info requested → Rejected
```

---

## What's been built (MVP)

| Page | Status | Notes |
|------|--------|-------|
| Dashboard | ✅ | Pie chart of submissions by event, attendees table |
| Submissions | ✅ | Pending cards with action buttons, full table, drawer with Approve/Reject/Info requested |
| Events | ✅ | Upcoming event cards with competition branding, past events table, edit drawer |
| Contacts | ✅ | Full table, edit drawer with comments thread, add new contact |
| Settings | 🔲 Placeholder | Empty page, reserved for future config |
| API routes | ✅ | Full CRUD for all three models + public form submission endpoint |

---

## Key design decisions (don't revisit unless Henrik asks)
- **Both applicant and accredited individual are stored as Contacts.** They can be the same person or different.
- **Email is primary dedup key, but name must also match** to avoid merging e.g. John Doe and Jane Doe who share `editor@newspaper.com`.
- **Events auto-create from form submissions** via `cms_event_id` from the Hammarby website CMS. Capacity fields are set manually after creation.
- **Email distribution via Data Talks CDP** (Henrik is the internal owner). Three email templates needed: confirmation, rejection, info request (with custom message variable).
- **No Prezly.** The full stack replaces Prezly at ~€0 marginal cost beyond Data Talks.

---

## What's next (likely next session topics)
1. **Data Talks email integration** — wire up the three status-change triggers to the Data Talks API. Slot in `/src/app/api/submissions/[id]/route.ts` where status changes are processed.
2. **Website form connection** — update the Hammarby website form to POST to `/api/submissions` instead of emailing an inbox.
3. **Deployment** — push to GitHub, connect to Vercel, swap SQLite for Supabase/Neon PostgreSQL. One-line change in `prisma/schema.prisma`.
4. **Attended / No-show tracking** — currently a placeholder. Needs a mechanism for marking who actually showed up after each event.
5. **Search** — the search bar in the header is currently cosmetic. Needs to filter across submissions, events, and contacts.

---

## UX design reference
Seven mockup screens were provided by Henrik. Key patterns:
- **Two-panel layout:** list/table on the left, Notion-style drawer slides in from the right on row click
- **Background:** sage green (`#c8d8c8`)
- **Active nav:** golden yellow (`#F5C000`)
- **Competition card colours:** Allsvenskan = dark navy, UEFA Women's = burnt orange, Svenska Cupen = dark blue
- **Status badge colours:** Pending = amber, Approved = green, Rejected = red, Info requested = blue
- **Category badge colours:** Press = light blue, Foto = green, Radio = orange, TV = indigo, Webb = teal

---

## Context from the planning conversation
The full architecture was designed across a conversation on claude.ai before moving to Cowork. Key background: Henrik works in a combined Marketing & Communications department at Hammarby Fotboll. He is the internal owner of the Data Talks CDP (a sports-focused CDP). The accreditation tool is scoped to press contacts only — not fans — so Data Talks is used only for outbound email, not as the contact database.
