import { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
      maxAge: 10 * 60, // Magic links expire after 10 minutes
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          to: email,
          from: `Acca <${provider.from}>`,
          subject: "Sign in to Acca",
          text: `Sign in to Acca\n\nClick the link below to sign in:\n\n${url}\n\nThis link expires in 10 minutes. If you didn't request this, you can ignore this email.`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 16px;background:#ffffff;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="${process.env.NEXTAUTH_URL}/acca_logo.png" alt="Acca" style="height:40px;width:auto;display:block;" />
                  </td>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <div style="width:1px;height:32px;background:#e5e7eb;"></div>
                  </td>
                  <td style="vertical-align:middle;">
                    <img src="${process.env.NEXTAUTH_URL}/hif-logo.png" alt="Hammarby IF" style="height:40px;width:auto;display:block;" />
                  </td>
                </tr>
              </table>
              <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;">Sign in to Acca</h2>
              <p style="color:#6b7280;font-size:15px;margin:0 0 24px;line-height:1.5;">
                Click the button below to sign in to your account. This link is valid for 10 minutes.
              </p>
              <a href="${url}"
                style="display:inline-block;background:#1b2e1e;color:#ffffff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
                Sign in to Acca
              </a>
              <p style="color:#9ca3af;font-size:12px;margin-top:32px;line-height:1.5;">
                If you didn't request this link, you can safely ignore this email.
              </p>
            </div>
          `,
        });
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // Sessions expire after 24 hours of inactivity
  },
  callbacks: {
    // T006: DB-based access control — replaces hardcoded whitelist
    async signIn({ user }) {
      if (!user.email) return false;
      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      if (!dbUser) return false;                       // not invited/registered
      if (dbUser.status === "inactive") return false;  // deactivated by admin
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // On first sign-in, user is populated — persist custom fields into token
      if (user) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        token.id = user.id;
        token.role = dbUser?.role ?? "User";
        token.phone = dbUser?.phone ?? null;
        token.notifyNewSubmissions = dbUser?.notifyNewSubmissions ?? true;
        token.image = user.image ?? null;
        token.status = dbUser?.status ?? "active";

        // T009: Transition invited → active on first sign-in
        if (dbUser?.status === "invited") {
          await prisma.user.update({
            where: { id: user.id },
            data: { status: "active" },
          });
          token.status = "active";
        }
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
    // T008: Check user status on every request (FR-018)
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
    verifyRequest: "/login?verify=1",
    error: "/login?error=1",
  },
};
