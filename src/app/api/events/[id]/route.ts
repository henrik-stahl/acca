import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      submissions: {
        include: { applicant: true, accredited: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  if (body.eventDate) body.eventDate = new Date(body.eventDate);
  // Treat empty string as null so staff can clear the CMS ID
  if ("cmsEventId" in body && body.cmsEventId === "") body.cmsEventId = null;
  try {
    const event = await prisma.event.update({
      where: { id: params.id },
      data: body,
    });
    return NextResponse.json(event);
  } catch (err: any) {
    // Prisma unique constraint violation
    if (err?.code === "P2002" && err?.meta?.target?.includes("cmsEventId")) {
      return NextResponse.json(
        { error: "CMS Event ID already in use by another event" },
        { status: 409 }
      );
    }
    throw err;
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.event.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
