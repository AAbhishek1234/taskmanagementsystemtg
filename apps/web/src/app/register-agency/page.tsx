"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Building2, User, Mail, Lock, Eye, EyeOff, Zap, ShieldCheck, Users } from "lucide-react";
import { apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";

export default function RegisterAgencyPage() {
  const [workspaceName, setWorkspaceName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost("/auth/register-agency", { workspaceName, adminName, email, password });
      await refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#eef1fb] px-4 py-4 sm:py-10 lg:justify-end lg:px-16 xl:px-24">
      {/* Full-bleed background photo, clipped diagonally, desktop only */}
      <div
        className="pointer-events-none absolute inset-0 hidden lg:block"
        style={{ clipPath: "polygon(0 0, 66% 0, 46% 100%, 0 100%)" }}
      >
        <Image src="/images/login-bg.png" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900/65 via-navy-900/55 to-navy-900/40" />
      </div>
      {/* Mobile solid navy fallback */}
      <div className="absolute inset-0 bg-navy-900 lg:hidden" />

      {/* Decorative right-side accents (desktop) */}
      <div className="pointer-events-none absolute -bottom-24 right-0 hidden h-96 w-96 rounded-full bg-blue-200/40 blur-3xl lg:block" />
      <div
        className="pointer-events-none absolute right-24 top-0 hidden h-64 w-px bg-gradient-to-b from-orange via-orange/40 to-transparent lg:block"
        style={{ transform: "rotate(20deg)", transformOrigin: "top" }}
      />

      {/* Left-side text content, over the image, desktop only */}
           <div className="relative z-10 hidden max-w-xs flex-1 self-center text-white lg:flex lg:flex-col lg:pr-6 xl:max-w-md xl:pr-12">
        <div className="flex items-center gap-2">
          <Logo size={36} inverted />
        </div>

        <h1 className="mt-10 text-3xl font-bold leading-tight xl:text-[44px]">
          Set up your <br />
          <span className="text-orange">workspace</span>
        </h1>
        <p className="mt-4 text-sm text-white/90 xl:text-base">
          Create your workspace and its first admin account in a minute.
        </p>

        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 text-sm text-white/90">
          <span className="flex items-center gap-2">
            <Zap size={16} className="text-orange" />
            Collaborate seamlessly
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-orange" />
            Track progress
          </span>
          <span className="flex items-center gap-2">
            <Users size={16} className="text-orange" />
            Deliver faster
          </span>
        </div>

        <div className="mt-auto flex items-center gap-3 pt-24 text-xs text-white/70">
          <span className="h-px w-6 bg-orange" />
          Build Today. Grow Tomorrow.
        </div>
      </div>

      {/* Floating card */}
      <div className="relative z-10 w-full max-w-sm lg:mr-4 xl:mr-16">
        <div className="rounded-2xl bg-white p-6 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.35)] sm:p-8">
          <div className="flex items-center gap-2">
            <Logo size={28} />
          </div>

          <h2 className="mt-4 text-2xl font-bold text-navy-900 sm:mt-6">Create your workspace</h2>
          {/* <p className="mt-1 text-sm text-navy-400">
            This creates your workspace and its first admin account.
          </p> */}

          <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
            <Field
              label="Agency name"
              value={workspaceName}
              onChange={setWorkspaceName}
              placeholder="Acme Digital"
              icon={<Building2 size={16} />}
            />
            <Field
              label="Your name"
              value={adminName}
              onChange={setAdminName}
              placeholder="Jordan Lee"
              icon={<User size={16} />}
            />
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@agency.com"
              icon={<Mail size={16} />}
            />

            <div>
              <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">
                Password
              </label>
              <div className="relative mt-1">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="input w-full pl-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy-500"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="btn-accent flex w-full items-center justify-center gap-2"
            >
              {submitting ? "Creating..." : (
                <>
                  Create workspace <span aria-hidden>→</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-navy-300">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-orange hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">{label}</label>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300">
          {icon}
        </span>
        <input
          type={type}
          required
          minLength={type === "password" ? 8 : 2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input mt-0 w-full pl-9"
        />
      </div>
    </div>
  );
}