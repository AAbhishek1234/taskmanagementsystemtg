"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, X, Users, Palette, Trash2 } from "lucide-react";
import { apiGet, apiPost, apiDelete, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { Client } from "@/lib/types";

export default function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canCreate = user?.role === "admin" || user?.role === "manager";
  // Matches the backend: only admins can delete (archive) clients.
  const canDelete = user?.role === "admin";

  async function load() {
    setLoading(true);
    try {
      const res = await apiGet<{ clients: Client[] }>("/clients");
      setClients(res.clients);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function deleteClient(id: string, name: string) {
    if (
      !confirm(
        `Delete "${name}"?\n\nThe client will be hidden everywhere. Existing tasks and files are kept.`,
      )
    ) {
      return;
    }
    setPageError(null);
    setDeletingId(id);
    try {
      await apiDelete(`/clients/${id}`);
      await load();
    } catch (err) {
      setPageError(err instanceof ApiError ? err.message : "Could not delete this client.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="relative w-full max-w-full space-y-5 overflow-x-clip sm:space-y-6">
      <style>{`
        @keyframes floatCard {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.85) translateY(16px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .client-card {
          animation: popIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both, floatCard 4.5s ease-in-out infinite;
        }
        .client-card:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 top-52 h-40 w-40 rounded-full bg-orange/10 blur-3xl" />

      {/* Header */}
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-800 to-navy-900 text-white shadow-lg shadow-navy-900/20">
            <Users size={20} />
          </span>
          <div>
            <h1 className="text-base font-bold text-navy-900 sm:text-xl">Clients</h1>
            <p className="text-sm text-navy-400">
              Everyone you can see, based on your assignments
              {!loading && <span className="text-navy-500"> &middot; {clients.length} total</span>}
              .
            </p>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="btn-accent flex items-center gap-1.5 whitespace-nowrap"
          >
            {showForm ? (
              <>
                <X size={16} /> <span className="hidden sm:inline">Close</span>
              </>
            ) : (
              <>
                <Plus size={16} /> <span className="hidden sm:inline">New client</span>
                <span className="sm:hidden">New</span>
              </>
            )}
          </button>
        )}
      </div>

      {showForm && canCreate && (
        <NewClientForm
          existingNames={clients.map((c) => c.name)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
          onClose={() => setShowForm(false)}
        />
      )}

      {pageError && (
        <p className="relative rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{pageError}</p>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-2xl bg-white/60 shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
            />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl bg-white p-10 text-center shadow-[0_2px_10px_rgba(15,23,42,0.06)] sm:p-14">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-50 to-navy-100 text-navy-300">
            <Users size={26} />
          </div>
          <p className="mt-4 text-sm font-medium text-navy-500">No clients yet.</p>
          {canCreate && (
            <p className="mt-1 text-xs text-navy-300">Add your first client to start tracking their work.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {clients.map((c, i) => (
            <div
              key={c.id}
              className="client-card group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-2xl bg-white p-4 text-center shadow-[0_4px_16px_rgba(15,23,42,0.08)] transition-shadow duration-300 hover:shadow-[0_20px_40px_-10px_rgba(15,23,42,0.25)]"
              style={{ animationDelay: `${i * 70}ms, ${i * 220}ms` }}
            >
              {/* Glow accent on hover */}
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30"
                style={{ backgroundColor: c.brandColor ?? "#7F94BF" }}
              />

              {/* Delete (admin only). Always visible on mobile, on hover for desktop. */}
              {canDelete && (
                <button
                  onClick={() => deleteClient(c.id, c.name)}
                  disabled={deletingId === c.id}
                  title="Delete client"
                  aria-label={`Delete ${c.name}`}
                  className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-navy-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              )}

              <span
                className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-base font-bold text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 sm:h-16 sm:w-16"
                style={{ backgroundColor: c.brandColor ?? "#7F94BF" }}
              >
                {c.name.slice(0, 2).toUpperCase()}
              </span>

              <h3 className="relative mt-3 line-clamp-2 px-1 text-sm font-semibold text-navy-900">{c.name}</h3>

              <div className="relative mt-1.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.brandColor ?? "#7F94BF" }} />
                <span className="text-[10px] font-medium uppercase tracking-wide text-navy-300">Client</span>
              </div>

              {/* Bottom accent bar */}
              <div
                className="absolute bottom-0 left-0 h-1 w-0 rounded-r-full transition-all duration-500 group-hover:w-full"
                style={{ backgroundColor: c.brandColor ?? "#7F94BF" }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewClientForm({
  existingNames,
  onCreated,
  onClose,
}: {
  existingNames: string[];
  onCreated: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [brandColor, setBrandColor] = useState("#081C4E");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const trimmed = name.trim();
  // Instant feedback using the clients this user can see. The backend is still
  // the real check (it sees every client in the workspace).
  const isDuplicate =
    trimmed.length > 0 && existingNames.some((n) => n.trim().toLowerCase() === trimmed.toLowerCase());

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (trimmed.length < 2) {
      setError("Client name must be at least 2 characters.");
      return;
    }
    if (isDuplicate) {
      setError("A client with this name already exists.");
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/clients", { name: trimmed, brandColor });
      setName("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create this client.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-blue-100 to-orange/10 blur-2xl" />
      <div className="relative mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-navy-900">New client</h2>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-navy-400 hover:bg-navy-50 hover:text-navy-700"
        >
          <X size={16} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="relative flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Client name</label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            required
            placeholder="Acme Digital"
            className={`input mt-1 w-full ${isDuplicate ? "border-red-300" : ""}`}
          />
          {isDuplicate && (
            <p className="mt-1 text-[11px] text-red-600">A client with this name already exists.</p>
          )}
        </div>
        <div>
          <label className="label flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-navy-500">
            <Palette size={12} /> Brand color
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-xl border border-navy-100"
            />
            <span
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white sm:flex"
              style={{ backgroundColor: brandColor }}
            >
              {trimmed.slice(0, 2).toUpperCase() || "AA"}
            </span>
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting || isDuplicate}
          className="btn-accent flex items-center gap-1.5"
        >
          <Plus size={16} />
          {submitting ? "Saving..." : "Add client"}
        </button>
        {error && <p className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </form>
    </div>
  );
}