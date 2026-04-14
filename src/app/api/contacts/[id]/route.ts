import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      submissionsAsAccredited: {
        include: { event: true, applicant: true },
        orderBy: { createdAt: "desc" },
      },
      submissionsAsApplicant: {
        include: { event: true, accredited: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(contact);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: body,
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
  const [attendedRow] = await prisma.submission.groupBy({
    by: ["accreditedId"],
    where: { accreditedId: params.id, status: "Approved", attended: true },
    _count: { id: true },
  });
  const [noShowRow] = await prisma.submission.groupBy({
    by: ["accreditedId"],
    where: { accreditedId: params.id, status: "Approved", attended: false, event: { eventDate: { lt: now } } },
    _count: { id: true },
  });

  return NextResponse.json({
    ...contact,
    attendedCount: attendedRow?._count.id ?? 0,
    noShowCount: noShowRow?._count.id ?? 0,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.contact.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
