"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginPageInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      router.replace("/");
    }
  }, [sessionStatus, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });
    setLoading(false);
    if (res?.ok) {
      router.replace("/");
    } else {
      setError("Invalid email or password.");
    }
  }

  if (sessionStatus === "loading" || sessionStatus === "authenticated") {
    return null;
  }

  const displayError = error ?? (urlError ? "Something went wrong. Please try again." : null);

  return (
    <div className="min-h-screen bg-[#cde0d4] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm">
        {/* Logos */}
        <div className="flex items-center gap-3 mb-8">
          <img src="/acca_logo.png" alt="Acca" className="h-9 w-auto" />
          <div className="w-px h-8 bg-gray-200" />
          <img src="/hif-logo.png" alt="Hammarby IF" className="h-9 w-auto" />
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-1">Sign in to Acca</h1>
        <p className="text-sm text-gray-500 mb-6">Enter your email and password to sign in.</p>

        {displayError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {displayError}
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
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-[#1b2e1e] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginPageInner /></Suspense>;
}
