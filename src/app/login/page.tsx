"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginPageInner() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const verify = searchParams.get("verify");
  const error = searchParams.get("error");

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      router.replace("/");
    }
  }, [sessionStatus, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("email", { email, redirect: false, callbackUrl: "/" });
    setLoading(false);
    if (res?.ok) setSent(true);
  }

  if (sessionStatus === "loading" || sessionStatus === "authenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#cde0d4] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm">
        {/* Logos */}
        <div className="flex items-center gap-3 mb-8">
          <img src="/acca_logo.png" alt="Acca" className="h-9 w-auto" />
          <div className="w-px h-8 bg-gray-200" />
          <img src="/hif-logo.png" alt="Hammarby IF" className="h-9 w-auto" />
        </div>

        {sent || verify ? (
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
            <p className="text-sm text-gray-500">
              We sent a sign-in link to <strong>{email || "your email"}</strong>. Click the link
              to sign in — it expires in 24 hours.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Sign in to Acca</h1>
            <p className="text-sm text-gray-500 mb-6">
              Enter your email address and we'll send you a magic link.
            </p>

            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                Access denied. Your email is not on the approved list.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@hammarbyfotboll.se"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sage-400 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-[#1b2e1e] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginPageInner /></Suspense>;
}
