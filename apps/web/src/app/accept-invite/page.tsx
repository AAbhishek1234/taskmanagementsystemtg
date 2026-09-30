"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost, ApiError } from "@/lib/api";
import { Logo } from "@/components/Logo";

function AcceptInviteForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost("/auth/accept-invite", { token, password });
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "This invite link is invalid or has expired.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return <p className="text-sm text-red-600">This invite link is missing its token.</p>;
  }

  if (done) {
    return <p className="text-sm font-medium text-emerald-700">Account created. Redirecting you to sign in...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Choose a password</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input mt-1"
        />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-accent w-full">
        {submitting ? "Setting up..." : "Set password & join"}
      </button>
    </form>
  );
}

export default function AcceptInvitePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy px-4">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-navy-700 opacity-60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-orange/30 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo size={44} inverted />
        </div>
        <div className="card p-8">
          <h1 className="text-xl font-semibold text-navy-900">Accept your invitation</h1>
          <p className="mt-1 text-sm text-navy-400">Set a password to finish joining the workspace.</p>
          <div className="mt-6">
            <Suspense fallback={null}>
              <AcceptInviteForm />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}
