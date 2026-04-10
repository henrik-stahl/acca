import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/users/[id] — update role or status (Admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;

  let body: { role?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { role, status } = body;

  // Validate inputs
  if (role !== undefined && !["Admin", "User"].includes(role)) {
    return NextResponse.json({ error: "Role must be Admin or User" }, { status: 400 });
  }
  if (status !== undefined && !["active", "inactive"].includes(status)) {
    return NextResponse.json({ error: "Status must be active or inactive" }, { status: 400 });
  }

  // Fetch target user
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const currentUserId = (session.user as any).id as string;

  // Self-deactivation prevention
  if (status === "inactive" && id === currentUserId) {
    return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
  }

  // Last-admin protection: prevent demoting or deactivating the last active Admin
  if (role === "User" || status === "inactive") {
    if (target.role === "Admin") {
      const activeAdminCount = await prisma.user.count({
        where: { role: "Admin", status: "active" },
      });
      if (activeAdminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last active admin" },
          { status: 400 }
        );
      }
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(role !== undefined ? { role } : {}),
      ...(status !== undefined ? { status } : {}),
    },
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
  });

  return NextResponse.json(updated);
}
