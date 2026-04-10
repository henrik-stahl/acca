import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put, del } from "@vercel/blob";

export async function POST(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Image upload requires BLOB_READ_WRITE_TOKEN to be configured" },
      { status: 501 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("avatar") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Upload the new image to Vercel Blob
  const blob = await put(`avatars/${user.id}.${ext}`, buffer, {
    access: "public",
    allowOverwrite: true,
  });

  // Delete the previous image if it was stored in Blob (https:// URL)
  if (user.image && user.image.startsWith("https://")) {
    try {
      await del(user.image);
    } catch {
      // Non-fatal: old blob may have already been deleted or URL may differ
    }
  }

  await prisma.user.update({ where: { id: user.id }, data: { image: blob.url } });

  return NextResponse.json({ image: blob.url });
}
