import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInvitationEmail } from "@/lib/mailer";

// GET /api/users — list all users (Admin only)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      status: true,
      invitedAt: true,
      invitedBy: true,
    },
    orderBy: { invitedAt: "asc" },
  });

  return NextResponse.json(users);
}

// POST /api/users — invite a new user (Admin only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, role } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!role || !["Admin", "User"].includes(role)) {
    return NextResponse.json({ error: "Role must be Admin or User" }, { status: 400 });
  }

  // Check if email is already taken
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });
  }

  const inviterName = session.user.name ?? session.user.email ?? "An admin";

  const user = await prisma.user.create({
    data: {
      email,
      role,
      status: "invited",
      invitedBy: session.user.email ?? undefined,
      invitedAt: new Date(),
    },
  });

  // Send invitation email (non-blocking — failure shouldn't prevent user creation)
  try {
    await sendInvitationEmail(email, inviterName);
  } catch (err) {
    console.error("Failed to send invitation email:", err);
  }

  return NextResponse.json(user, { status: 201 });
}
