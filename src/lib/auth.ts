import { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export const WHITELIST = [
  "henrik.stahl@hammarbyfotboll.se",
  "david.jesperson.mora@hammarbyfotboll.se",
  "lukas.lundberg@hammarbyfotboll.se",
];

const transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        await transport.sendMail({
          to: email,
          from: `Acca <${provider.from}>`,
          subject: "Sign in to Acca",
          text: `Sign in to Acca\n\nClick the link below to sign in:\n\n${url}\n\nThis link expires in 24 hours. If you didn't request this, you can ignore this email.`,
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
                Click the button below to sign in to your account. This link is valid for 24 hours.
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
  },
  callbacks: {
    async signIn({ user }) {
      return WHITELIST.includes(user.email ?? "");
    },
    async jwt({ token, user, trigger, session }) {
      // On first sign-in, `user` is populated — persist custom fields into the token
      if (user) {
        token.id = user.id;
        token.role = (user as any).role ?? "Admin";
        token.phone = (user as any).phone ?? null;
        token.notifyNewSubmissions = (user as any).notifyNewSubmissions ?? true;
        token.image = user.image ?? null;
      }
      // When update() is called from the client, merge the new values into the token
      if (trigger === "update" && session) {
        if (session.name !== undefined) token.name = session.name;
        if (session.phone !== undefined) token.phone = session.phone;
        if (session.notifyNewSubmissions !== undefined) token.notifyNewSubmissions = session.notifyNewSubmissions;
        if (session.image !== undefined) token.image = session.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        session.user.name = token.name as string | null | undefined;
        (session.user as any).role = token.role;
        (session.user as any).phone = token.phone;
        (session.user as any).notifyNewSubmissions = token.notifyNewSubmissions;
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
