import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protect all routes except NextAuth endpoints, the login page, and static assets
  matcher: [
    "/((?!api/auth|api/submissions|login|_next/static|_next/image|favicon\\.ico|uploads|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.jpeg|.*\\.webp|.*\\.ico|.*\\.woff2?).*)",
  ],
};
