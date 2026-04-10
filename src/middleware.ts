import { withAuth } from "next-auth/middleware";
import { NextRequest, NextResponse } from "next/server";

// Paths that must never be blocked by the staging password check,
// otherwise the NextAuth sign-in flow itself would be locked out.
function isExemptFromStagingAuth(pathname: string): boolean {
  return pathname.startsWith("/api/auth") || pathname === "/login";
}

function stagingAuthResponse(): NextResponse {
  return new NextResponse("Staging access required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Staging"' },
  });
}

function checkStagingPassword(req: NextRequest): boolean {
  const stagingPassword = process.env.STAGING_PASSWORD;
  if (!stagingPassword) return true; // not a staging environment

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) return false;

  const base64 = authHeader.slice("Basic ".length);
  const decoded = Buffer.from(base64, "base64").toString("utf-8");
  // Format is "username:password" — we only care about the password part
  const password = decoded.split(":").slice(1).join(":");
  return password === stagingPassword;
}

// next-auth's withAuth wraps a middleware function and injects the token.
export default withAuth(
  function middleware(req) {
    // Staging password check runs before the NextAuth session check
    if (!isExemptFromStagingAuth(req.nextUrl.pathname)) {
      if (!checkStagingPassword(req)) {
        return stagingAuthResponse();
      }
    }
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  // Protect all routes except NextAuth endpoints, the login page, and static assets
  matcher: [
    "/((?!api/auth|api/submissions|login|_next/static|_next/image|favicon\\.ico|uploads|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.jpeg|.*\\.webp|.*\\.ico|.*\\.woff2?).*)",
  ],
};
