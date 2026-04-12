import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextId } from "@/lib/utils";

export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { eventDate: "desc" },
    include: {
      _count: { select: { submissions: true } },
      submissions: { select: { status: true, category: true, assignedSeat: true, attended: true } },
    },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { eventName, eventDate, competition, arena, pressSeatsCapacity, photoPitCapacity, cmsEventId } = body;

  // Prevent duplicate events by CMS ID
  if (cmsEventId) {
    const existing = await prisma.event.findUnique({ where: { cmsEventId } });
    if (existing) return NextResponse.json(existing, { status: 200 });
  }

  const all = await prisma.event.findMany({ select: { eventId: true } });
  const eventId = nextId("EID", all.map((e) => e.eventId));

  const event = await prisma.event.create({
    data: {
      eventId,
      eventName,
      eventDate: new Date(eventDate),
      competition,
      arena,
      pressSeatsCapacity: pressSeatsCapacity ? Number(pressSeatsCapacity) : null,
      photoPitCapacity: photoPitCapacity ? Number(photoPitCapacity) : null,
      cmsEventId,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
