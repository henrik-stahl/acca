import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextId } from "@/lib/utils";

export async function GET() {
  const contacts = await prisma.contact.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          submissionsAsApplicant: true,
          submissionsAsAccredited: true,
        },
      },
    },
  });

  const now = new Date();

  // Attended: Approved + attended = true
  const attendedCounts = await prisma.submission.groupBy({
    by: ["accreditedId"],
    where: { status: "Approved", attended: true },
    _count: { id: true },
  });
  const attendedMap = Object.fromEntries(attendedCounts.map((r) => [r.accreditedId, r._count.id]));

  // No-show: Approved + attended = false + event is in the past
  const noShowCounts = await prisma.submission.groupBy({
    by: ["accreditedId"],
    where: { status: "Approved", attended: false, event: { eventDate: { lt: now } } },
    _count: { id: true },
  });
  const noShowMap = Object.fromEntries(noShowCounts.map((r) => [r.accreditedId, r._count.id]));

  return NextResponse.json(
    contacts.map((c) => ({
      ...c,
      attendedCount: attendedMap[c.id] ?? 0,
      noShowCount: noShowMap[c.id] ?? 0,
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { firstName, lastName, email, company, role, workPhone, cellPhone, team } =
    body;

  // Deduplication: email + firstName + lastName
  const existing = await prisma.contact.findFirst({
    where: { email, firstName, lastName },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Contact already exists", existing },
      { status: 409 }
    );
  }

  const all = await prisma.contact.findMany({ select: { contactId: true } });
  const contactId = nextId(
    "CID",
    all.map((c) => c.contactId)
  );

  const contact = await prisma.contact.create({
    data: {
      contactId,
      firstName,
      lastName,
      email,
      company,
      role,
      workPhone,
      cellPhone,
      comments: "[]",
      team: team ?? "[]",
    },
  });

  return NextResponse.json(contact, { status: 201 });
}
