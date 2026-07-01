import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextId } from "@/lib/utils";
import { findMatchingContact } from "@/lib/contacts";
import { sendProfile } from "@/lib/datatalks";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const { company, role, workPhone, cellPhone, team } = body;
  // Trim the identity fields on the stored value so stray leading/trailing
  // whitespace (e.g. "Anna ") never becomes part of the saved record.
  const firstName = (body.firstName ?? "").trim();
  const lastName = (body.lastName ?? "").trim();
  const email = (body.email ?? "").trim();

  // Deduplication: normalised email + firstName + lastName (see findMatchingContact).
  const existing = await findMatchingContact({ email, firstName, lastName });
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

  try {
    await sendProfile(contact);
  } catch (err) {
    console.error("DataTalks sendProfile failed:", err);
  }

  return NextResponse.json(contact, { status: 201 });
}
