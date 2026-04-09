import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const submission = await prisma.submission.findUnique({
    where: { id: params.id },
    include: { event: true, applicant: true, accredited: true },
  });
  if (!submission)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(submission);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  // If status is changing, set statusUpdatedAt
  const data: Record<string, unknown> = { ...body };
  if (body.status) {
    data.statusUpdatedAt = new Date();
  }

  const submission = await prisma.submission.update({
    where: { id: params.id },
    data,
    include: { event: true, applicant: true, accredited: true },
  });
  return NextResponse.json(submission);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.submission.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
