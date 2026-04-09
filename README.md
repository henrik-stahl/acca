# Acca — Press Accreditation Tool
### Hammarby Fotboll

Acca is a web-based press accreditation management tool for Hammarby Fotboll. It replaces the current form → email → manual workflow with a structured admin interface covering submissions, events, and contacts.

---

## Getting started

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Install dependencies
```bash
npm install
```

### 2. Set up the database
```bash
# Copy the example env file
cp .env.example .env

# Push the schema to create the SQLite database
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

### 3. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project structure

```
src/
├── app/                   # Next.js App Router pages
│   ├── page.tsx           # Dashboard
│   ├── submissions/       # Submissions management
│   ├── events/            # Events management
│   ├── contacts/          # Contact database
│   ├── settings/          # Settings (placeholder)
│   └── api/               # REST API routes
│       ├── contacts/
│       ├── events/
│       └── submissions/
├── components/            # React components
│   ├── layout/            # Sidebar, search bar
│   ├── ui/                # Badge, Button, Drawer
│   ├── contacts/
│   ├── events/
│   ├── submissions/
│   └── dashboard/
└── lib/
    ├── prisma.ts          # Prisma client singleton
    └── utils.ts           # Helpers, colour maps, formatters
prisma/
├── schema.prisma          # Database schema
└── seed.ts                # Sample data
```

---

## Accepting form submissions

The `/api/submissions` POST endpoint is the public-facing entry point for accreditation form submissions. Your Hammarby website form should POST to this endpoint with the following payload:

```json
{
  "eventName": "Hammarby IF – Mjällby AIF",
  "eventDate": "2026-04-04T15:00:00",
  "competition": "Allsvenskan 2026",
  "arena": "3Arena",
  "cmsEventId": "cms-001",
  "applicantFirstName": "Nick",
  "applicantLastName": "Fury",
  "applicantEmail": "nick.fury@shield.com",
  "applicantCompany": "S.H.I.E.L.D.",
  "applicantPhone": "0701234567",
  "accreditedFirstName": "Tony",
  "accreditedLastName": "Stark",
  "accreditedEmail": "tony.stark@starkindustries.com",
  "accreditedCompany": "S.H.I.E.L.D.",
  "accreditedPhone": "0701234567",
  "category": "Press",
  "pressCard": "AIPS-kort",
  "otherNotes": ""
}
```

---

## Deploying to production

### Database
Switch `DATABASE_URL` in `.env` from SQLite to a PostgreSQL connection string (e.g. from Supabase or Neon). Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"   # Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

Then run `npm run db:push` against the production database.

### Vercel
1. Push the project to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add `DATABASE_URL` as an environment variable in the Vercel project settings
4. Deploy

---

## Data Talks integration (coming soon)

The email trigger logic (approve/reject/info request) is structured to call an external email API. To connect Data Talks, add your API credentials to `.env` and implement the trigger calls in `/api/submissions/[id]/route.ts` where status changes are processed.
