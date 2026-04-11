import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const dbUser = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        console.log("[auth] user found:", !!dbUser, "status:", dbUser?.status, "hasHash:", !!dbUser?.passwordHash);

        if (!dbUser) return null;
        if (dbUser.status === "inactive") return null;
        if (!dbUser.passwordHash) return null;

        const passwordValid = await bcrypt.compare(
          credentials.password,
          dbUser.passwordHash
        );

        console.log("[auth] passwordValid:", passwordValid);

        if (!passwordValid) return null;

        // Transition invited → active on first sign-in
        if (dbUser.status === "invited") {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { status: "active" },
          });
        }

        return {
          id: dbUser.id,
          email: dbUser.email ?? "",
          name: dbUser.name ?? null,
          image: dbUser.image ?? null,
          role: dbUser.role,
          phone: dbUser.phone ?? null,
          notifyNewSubmissions: dbUser.notifyNewSubmissions,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // Sessions expire after 24 hours of inactivity
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On first sign-in, user is populated — persist custom fields into token
      if (user) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        token.id = user.id;
        token.role = dbUser?.role ?? "User";
        token.phone = dbUser?.phone ?? null;
        token.notifyNewSubmissions = dbUser?.notifyNewSubmissions ?? true;
        token.image = user.image ?? null;
        token.status = dbUser?.status === "invited" ? "active" : (dbUser?.status ?? "active");
      }
      // When update() is called from the client, merge new values into token
      if (trigger === "update" && session) {
        if (session.name !== undefined) token.name = session.name;
        if (session.phone !== undefined) token.phone = session.phone;
        if (session.notifyNewSubmissions !== undefined) token.notifyNewSubmissions = session.notifyNewSubmissions;
        if (session.image !== undefined) token.image = session.image;
      }
      return token;
    },
    // Check user status on every request
    async session({ session, token }) {
      // Look up the current user — prefer id, fall back to email for older tokens
      const dbUser = token.id
        ? await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, role: true, status: true, phone: true, notifyNewSubmissions: true },
          })
        : token.email
        ? await prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true, role: true, status: true, phone: true, notifyNewSubmissions: true },
          })
        : null;

      // If user has been deactivated mid-session, invalidate immediately
      if (dbUser && dbUser.status === "inactive") {
        return { ...session, user: undefined as any };
      }

      if (session.user) {
        (session.user as any).id = dbUser?.id ?? token.id;
        session.user.name = token.name as string | null | undefined;
        (session.user as any).role = dbUser?.role ?? token.role ?? "User";
        (session.user as any).phone = dbUser?.phone ?? token.phone;
        (session.user as any).notifyNewSubmissions =
          dbUser?.notifyNewSubmissions ?? token.notifyNewSubmissions ?? true;
        session.user.image = token.image as string | null | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login?error=1",
  },
};
