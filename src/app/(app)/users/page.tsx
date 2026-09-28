"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Users, Mail, Copy, Check, ChevronDown, UserCog, Trash2 } from "lucide-react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import type { Client, WorkspaceUser } from "@/lib/types";
import { ROLE_LABELS, useAuth, type Role } from "@/context/AuthContext";

const INVITABLE_ROLES: Role[] = ["manager", "team_member", "freelancer", "client"];

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-navy-800 text-white",
  manager: "bg-blue-100 text-blue-700",
  team_member: "bg-purple-100 text-purple-700",
  freelancer: "bg-orange-100 text-orange-700",
  client: "bg-emerald-100 text-emerald-700",
};

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [tempCredential, setTempCredential] = useState<{ email: string; password: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [usersRes, clientsRes] = await Promise.all([
        apiGet<{ users: WorkspaceUser[] }>("/users"),
        apiGet<{ clients: Client[] }>("/clients"),
      ]);
      setUsers(usersRes.users);
      setClients(clientsRes.clients);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Admins can't be removed here, and nobody can remove themselves.
  function canRemove(u: WorkspaceUser) {
    return u.role !== "admin" && u.id !== currentUser?.id;
  }

  async function handleRemove(u: WorkspaceUser) {
    if (
      !confirm(
        `Remove ${u.name}?\n\nTheir tasks will be reassigned to you. If they have comments or uploaded files, they will be suspended instead of deleted so that history is kept.`,
      )
    ) {
      return;
    }
    setNotice(null);
    setRemovingId(u.id);
    try {
      const res = await apiPost<{ result: "deleted" | "suspended" }>(`/users/${u.id}/remove`, {});
      setNotice({
        kind: "ok",
        text:
          res.result === "deleted"
            ? `${u.name} was removed.`
            : `${u.name} has comments or files on record, so they were suspended instead of deleted.`,
      });
      await load();
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof ApiError ? err.message : "Could not remove this person." });
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="relative w-full max-w-full space-y-5 overflow-x-clip sm:space-y-6">
      <style>{`
        @keyframes popIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .row-pop { animation: popIn 0.35s ease both; }
      `}</style>

      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 top-52 h-40 w-40 rounded-full bg-orange/10 blur-3xl" />

      {/* Header */}
      <div className="relative flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-800 to-navy-900 text-white shadow-lg shadow-navy-900/20">
          <Users size={20} />
        </span>
        <div>
          <h1 className="text-base font-bold text-navy-900 sm:text-xl">Team</h1>
          <p className="text-sm text-navy-400">
            Add staff, freelancers and client contacts directly
            {!loading && <span className="text-navy-500"> &middot; {users.length} members</span>}
            . Admin only.
          </p>
        </div>
      </div>

      <DirectAddForm clients={clients} onCreated={(cred) => { setTempCredential(cred); load(); }} />

      {tempCredential && <TempCredentialBanner credential={tempCredential} onDismiss={() => setTempCredential(null)} />}

      {notice && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            notice.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {notice.text}
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-white/60 shadow-[0_2px_10px_rgba(15,23,42,0.06)]" />
          ))}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)] sm:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-[#eef1fb] to-[#e7ecfb] text-xs font-bold uppercase tracking-wide text-navy-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr
                    key={u.id}
                    className="row-pop group border-b border-navy-50 transition-colors last:border-0 hover:bg-[#fafbff]"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-navy-100 to-navy-200 text-xs font-bold text-navy-700 transition-transform duration-300 group-hover:scale-110">
                          {initialsOf(u.name)}
                        </span>
                        <span className="font-semibold text-navy-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-navy-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ROLE_BADGE[u.role] ?? "bg-navy-50 text-navy-600"}`}>
                        {ROLE_LABELS[u.role as Role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          u.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-navy-50 text-navy-500"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${u.status === "active" ? "animate-pulse bg-emerald-500" : "bg-navy-300"}`} />
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canRemove(u) && (
                        <button
                          onClick={() => handleRemove(u)}
                          disabled={removingId === u.id}
                          title={`Remove ${u.name}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-navy-300 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-navy-300">
                      No team members yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="space-y-2.5 sm:hidden">
            {users.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-[0_2px_10px_rgba(15,23,42,0.06)]">
                <p className="text-sm text-navy-300">No team members yet.</p>
              </div>
            ) : (
              users.map((u, i) => (
                <div
                  key={u.id}
                  className="row-pop flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy-100 to-navy-200 text-sm font-bold text-navy-700">
                    {initialsOf(u.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">{u.name}</p>
                    <p className="truncate text-xs text-navy-400">{u.email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_BADGE[u.role] ?? "bg-navy-50 text-navy-600"}`}>
                        {ROLE_LABELS[u.role as Role] ?? u.role}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          u.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-navy-50 text-navy-500"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${u.status === "active" ? "bg-emerald-500" : "bg-navy-300"}`} />
                        {u.status}
                      </span>
                    </div>
                  </div>
                  {canRemove(u) && (
                    <button
                      onClick={() => handleRemove(u)}
                      disabled={removingId === u.id}
                      title={`Remove ${u.name}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-navy-300 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TempCredentialBanner({
  credential,
  onDismiss,
}: {
  credential: { email: string; password: string };
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`Email: ${credential.email}\nPassword: ${credential.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-emerald-100/60 px-4 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.06)]">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
          <Check size={15} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-emerald-800">
            Account created — share this password now, it won&apos;t be shown again
          </p>
          <p className="text-xs text-emerald-700">
            {credential.email} &middot; <code className="font-mono">{credential.password}</code>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition-transform hover:scale-105"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button onClick={onDismiss} className="text-xs text-emerald-600 hover:text-emerald-800">
          Dismiss
        </button>
      </div>
    </div>
  );
}

/* ---------- Custom client dropdown (replaces native <select multiple>) ---------- */

function ClientDropdown({
  clients,
  clientIds,
  onChange,
  multiple,
}: {
  clients: Client[];
  clientIds: string[];
  onChange: (ids: string[]) => void;
  multiple: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(id: string) {
    if (multiple) {
      onChange(clientIds.includes(id) ? clientIds.filter((c) => c !== id) : [...clientIds, id]);
    } else {
      onChange([id]);
    }
    setOpen(false);
  }

  const selectedNames = clients.filter((c) => clientIds.includes(c.id)).map((c) => c.name);
  const label =
    selectedNames.length === 0
      ? multiple
        ? "Select clients"
        : "Select a client"
      : selectedNames.length <= 2
      ? selectedNames.join(", ")
      : `${selectedNames.length} clients selected`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`input mt-1 flex w-full items-center justify-between gap-2 text-left ${
          selectedNames.length === 0 ? "text-navy-300" : "text-navy-800"
        }`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={14} className={`shrink-0 text-navy-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-navy-100 bg-white p-1.5 shadow-card-hover">
          {clients.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-navy-300">No clients yet.</p>
          ) : (
            clients.map((c) => {
              const checked = clientIds.includes(c.id);
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                    checked ? "bg-orange/10 font-semibold text-orange" : "text-navy-700 hover:bg-navy-50"
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function DirectAddForm({
  clients,
  onCreated,
}: {
  clients: Client[];
  onCreated: (credential: { email: string; password: string }) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("team_member");
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiPost<{ user: WorkspaceUser; temporaryPassword: string }>("/users/direct", {
        email,
        name,
        role,
        clientIds: role === "client" ? clientIds.slice(0, 1) : clientIds,
      });
      setEmail("");
      setName("");
      setClientIds([]);
      onCreated({ email: res.user.email, password: res.temporaryPassword });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create this account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 overflow-hidden rounded-full">
        <div className="h-full w-full bg-gradient-to-br from-emerald-100 to-blue-100 blur-2xl" />
      </div>

      <div className="relative mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <UserCog size={15} />
        </span>
        <h2 className="text-sm font-semibold text-navy-900">Add someone directly</h2>
      </div>
      <p className="relative -mt-2 mb-4 text-xs text-navy-400">
        Creates an active account immediately with a temporary password you&apos;ll share yourself.
      </p>

      <form onSubmit={handleSubmit} className="relative grid gap-3 sm:grid-cols-5">
        <div>
          <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" required className="input mt-1 w-full" />
        </div>
        <div className="sm:col-span-2">
          <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Email</label>
          <div className="relative mt-1">
            <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jordan@agency.com"
              required
              className="input w-full pl-8"
            />
          </div>
        </div>
        <div>
          <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Role</label>
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as Role);
              setClientIds([]);
            }}
            className="input mt-1 w-full"
          >
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">
            {role === "client" ? "Client" : "Clients"}
          </label>
          <ClientDropdown clients={clients} clientIds={clientIds} onChange={setClientIds} multiple={role !== "client"} />
        </div>

        <button
          type="submit"
          disabled={submitting || (role === "client" && clientIds.length !== 1)}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 sm:col-span-5"
        >
          <UserCog size={15} />
          {submitting ? "Creating..." : "Create account"}
        </button>

        {role === "client" && (
          <p className="text-xs text-navy-400 sm:col-span-5">A client contact must be linked to exactly one client.</p>
        )}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-5">{error}</p>}
      </form>
    </div>
  );
}