import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextId } from "@/lib/utils";
import { sendSubmissionNotification } from "@/lib/mailer";

const VALID_CATEGORIES = ["Press", "Foto", "TV", "Radio", "Webb", "Annat"] as const;
type Category = typeof VALID_CATEGORIES[number];

const VALID_PRESS_CARDS = ["AIPS-kort", "Annat presskort", "Kort saknas"] as const;
type PressCard = typeof VALID_PRESS_CARDS[number];

/** Normalise incoming category to the canonical capitalised form, e.g. "webb" → "Webb". */
function normaliseCategory(raw: string): Category | null {
  const match = VALID_CATEGORIES.find((c) => c.toLowerCase() === raw.toLowerCase());
  return match ?? null;
}

/** Normalise incoming press card to the canonical form, e.g. "aips-kort" → "AIPS-kort". */
function normalisePressCard(raw: string): PressCard | null {
  const match = VALID_PRESS_CARDS.find((p) => p.toLowerCase() === raw.toLowerCase());
  return match ?? null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const submissions = await prisma.submission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      event: true,
      applicant: true,
      accredited: true,
    },
  });
  return NextResponse.json(submissions);
}

/**
 * Public-facing endpoint: receives a form submission.
 * Handles Contact deduplication and Event lookup-or-create.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  // ── Admin-created submission (direct IDs) ──────────────────────────────────
  if (body.eventId && body.accreditedId) {
    const { eventId, accreditedId, category, pressCard, assignedSeat, accreditationType } = body;

    const contact = await prisma.contact.findUnique({ where: { id: accreditedId } });
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    const all = await prisma.submission.findMany({ select: { submissionId: true } });
    const submissionId = nextId("SID", all.map((s) => s.submissionId));

    const submission = await prisma.submission.create({
      data: {
        submissionId,
        eventId,
        applicantId: accreditedId,
        accreditedId,
        company: contact.company ?? "",
        phone: contact.cellPhone ?? contact.workPhone ?? "",
        category,
        assignedSeat: assignedSeat || (["Foto", "TV"].includes(category) ? "Photo pit" : "Press seat"),
        accreditationType: accreditationType || (category === "Foto" ? "Foto" : category === "TV" ? "TV" : "Media"),
        pressCard: pressCard || null,
        status: "Pending",
        emailSentTo: "[]",
      },
      include: { event: true, applicant: true, accredited: true },
    });

    // Send notifications to users who have them enabled
    try {
      const notifyUsers = await prisma.user.findMany({
        where: { notifyNewSubmissions: true, status: "active" },
        select: { email: true },
      });
      const emails = notifyUsers.map((u) => u.email).filter(Boolean) as string[];
      if (emails.length > 0) {
        await sendSubmissionNotification(emails, {
          eventName: submission.event.eventName,
          eventDate: new Date(submission.event.eventDate).toLocaleDateString("sv-SE"),
          accreditedName: `${submission.accredited.firstName} ${submission.accredited.lastName}`,
          company: contact.company ?? "",
          category,
          submissionId: submission.submissionId,
        });
      }
    } catch (err) {
      console.error("Failed to send submission notification:", err);
    }

    return NextResponse.json(submission, { status: 201 });
  }

  // ── CMS webhook submission (full form data) ────────────────────────────────
  // Verify webhook secret
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret) {
    const providedSecret = req.headers.get("x-webhook-secret");
    if (providedSecret !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Validate required fields
  const required = [
    "cmsEventId", "eventName", "eventDate", "competition",
    "applicantFirstName", "applicantLastName", "applicantEmail",
    "accreditedFirstName", "accreditedLastName", "accreditedEmail",
    "category", "pressCard",
  ];
  const missing = required.filter((f) => !body[f]);
  if (missing.length > 0) {
    return NextResponse.json({ error: "Missing required fields", missing }, { status: 400 });
  }

  const {
    // Event fields (from CMS form)
    eventName,
    eventDate,
    competition,
    arena,
    cmsEventId,
    // Applicant fields
    applicantFirstName,
    applicantLastName,
    applicantEmail,
    applicantCompany,
    applicantPhone,
    // Accredited individual fields
    accreditedFirstName,
    accreditedLastName,
    accreditedEmail,
    accreditedCompany,
    accreditedPhone,
    // Submission fields
    pressCard,
    otherNotes,
  } = body;

  const rawCategory = body.category ?? "";
  const normalisedCategory = normaliseCategory(rawCategory);
  const category = normalisedCategory ?? "Annat";
  const categoryFallbackNote = normalisedCategory === null
    ? `[Category not recognised: "${rawCategory}"]`
    : null;

  const rawPressCard = pressCard ?? "";
  const normalisedPressCard = rawPressCard ? normalisePressCard(rawPressCard) : null;
  const resolvedPressCard = rawPressCard ? (normalisedPressCard ?? "Annat presskort") : null;
  const pressCardFallbackNote = rawPressCard && normalisedPressCard === null
    ? `[Press card not recognised: "${rawPressCard}"]`
    : null;

  // --- Resolve or create Event ---
  let event = cmsEventId
    ? await prisma.event.findUnique({ where: { cmsEventId } })
    : null;

  if (event) {
    // Event exists — update only the CMS-sourced fields so that
    // manually managed fields (pressSeatsCapacity, photoPitCapacity) are preserved.
    // Only overwrite a field if the submission provides a non-empty value.
    const cmsUpdate: Record<string, unknown> = { lastUpdatedAt: new Date() };
    if (eventName) cmsUpdate.eventName = eventName;
    if (eventDate) cmsUpdate.eventDate = new Date(eventDate);
    if (competition) cmsUpdate.competition = competition;
    if (arena) cmsUpdate.arena = arena;
    event = await prisma.event.update({
      where: { id: event.id },
      data: cmsUpdate,
    });
  } else {
    const all = await prisma.event.findMany({ select: { eventId: true } });
    const eventId = nextId("EID", all.map((e) => e.eventId));
    event = await prisma.event.create({
      data: {
        eventId,
        eventName,
        eventDate: new Date(eventDate),
        competition,
        arena,
        cmsEventId,
      },
    });
  }

  // --- Resolve or create Applicant Contact ---
  let applicant = await prisma.contact.findFirst({
    where: {
      email: applicantEmail,
      firstName: applicantFirstName,
      lastName: applicantLastName,
    },
  });
  if (!applicant) {
    const all = await prisma.contact.findMany({ select: { contactId: true } });
    const contactId = nextId("CID", all.map((c) => c.contactId));
    applicant = await prisma.contact.create({
      data: {
        contactId,
        firstName: applicantFirstName,
        lastName: applicantLastName,
        email: applicantEmail,
        company: applicantCompany,
        workPhone: applicantPhone,
        comments: "[]",
      },
    });
  }

  // --- Resolve or create Accredited Contact ---
  let accredited = await prisma.contact.findFirst({
    where: {
      email: accreditedEmail,
      firstName: accreditedFirstName,
      lastName: accreditedLastName,
    },
  });
  if (!accredited) {
    const all = await prisma.contact.findMany({ select: { contactId: true } });
    const contactId = nextId("CID", all.map((c) => c.contactId));
    accredited = await prisma.contact.create({
      data: {
        contactId,
        firstName: accreditedFirstName,
        lastName: accreditedLastName,
        email: accreditedEmail,
        company: accreditedCompany,
        cellPhone: accreditedPhone,
        comments: "[]",
      },
    });
  }

  // --- Create Submission ---
  const all = await prisma.submission.findMany({ select: { submissionId: true } });
  const submissionId = nextId("SID", all.map((s) => s.submissionId));

  const submission = await prisma.submission.create({
    data: {
      submissionId,
      eventId: event.id,
      applicantId: applicant.id,
      accreditedId: accredited.id,
      company: accreditedCompany,
      phone: accreditedPhone,
      category,
      assignedSeat: ["Foto", "TV"].includes(category) ? "Photo pit" : "Press seat",
      accreditationType: category === "Foto" ? "Foto" : category === "TV" ? "TV" : "Media",
      pressCard: resolvedPressCard,
      otherNotes: [otherNotes, categoryFallbackNote, pressCardFallbackNote].filter(Boolean).join("\n") || null,
      status: "Pending",
      emailSentTo: "[]",
    },
    include: { event: true, applicant: true, accredited: true },
  });

  // Send email notifications to users who have them enabled
  try {
    const notifyUsers = await prisma.user.findMany({
      where: { notifyNewSubmissions: true, status: "active" },
      select: { email: true },
    });
    const emails = notifyUsers.map((u) => u.email).filter(Boolean) as string[];
    if (emails.length > 0) {
      await sendSubmissionNotification(emails, {
        eventName: event.eventName,
        eventDate: new Date(event.eventDate).toLocaleDateString("sv-SE"),
        accreditedName: `${accredited.firstName} ${accredited.lastName}`,
        company: accreditedCompany ?? "",
        category,
        submissionId: submission.submissionId,
      });
    }
  } catch (err) {
    console.error("Failed to send submission notification:", err);
  }

  return NextResponse.json(submission, { status: 201 });
}
