import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextId } from "@/lib/utils";
import { sendSubmissionNotification } from "@/lib/mailer";

export async function GET() {
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

    return NextResponse.json(submission, { status: 201 });
  }

  // ── CMS webhook submission (full form data) ────────────────────────────────
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
    category,
    pressCard,
    otherNotes,
  } = body;

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
      pressCard,
      otherNotes,
      status: "Pending",
      emailSentTo: "[]",
    },
    include: { event: true, applicant: true, accredited: true },
  });

  // Send email notifications to users who have them enabled
  try {
    const notifyUsers = await prisma.user.findMany({
      where: { notifyNewSubmissions: true },
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
