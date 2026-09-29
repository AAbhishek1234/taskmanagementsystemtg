"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Filter,
  Pencil,
  Trash2,
} from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { Client, ContentItem } from "@/lib/types";

const CHANNELS = ["instagram", "facebook", "linkedin", "x", "youtube", "blog", "email", "ads", "other"];
const STATUSES = ["planned", "in_production", "ready", "scheduled", "published"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
}
function addMonths(d: Date, n: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}
function statusLabel(s: string) {
  return s.replace(/_/g, " ");
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [items, setItems] = useState<ContentItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientFilter, setClientFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canCreate = user?.role === "admin" || user?.role === "manager" || user?.role === "team_member";
  // Matches the backend: admins, managers and team members can edit/delete.
  const canEdit = canCreate;

  const gridStart = useMemo(() => addDays(month, -month.getUTCDay()), [month]);
  const gridDays = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart]);
  const todayKey = toDateKey(new Date());

  async function load() {
    setLoading(true);
    try {
      const from = toDateKey(gridStart);
      const to = toDateKey(addDays(gridStart, 41));
      const params = new URLSearchParams({ from, to });
      if (clientFilter) params.set("clientId", clientFilter);
      const [itemsRes, clientsRes] = await Promise.all([
        apiGet<{ contentItems: ContentItem[] }>(`/content-items?${params.toString()}`),
        apiGet<{ clients: Client[] }>("/clients"),
      ]);
      setItems(itemsRes.contentItems);
      setClients(clientsRes.clients);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, clientFilter]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, ContentItem[]>();
    for (const item of items) {
      const key = toDateKey(new Date(item.publishDate));
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  // Close the day panel automatically once its last item is deleted or moved away.
  useEffect(() => {
    if (selectedDay && !loading && (itemsByDay.get(selectedDay)?.length ?? 0) === 0) {
      setSelectedDay(null);
    }
  }, [itemsByDay, selectedDay, loading]);

  async function deleteItem(item: ContentItem) {
    const taskCount = item.deliverables?.length ?? 0;
    const extra =
      taskCount > 0
        ? `\n\n${taskCount} linked task${taskCount > 1 ? "s" : ""} will stay on the Tasks page but won't be tied to the calendar.`
        : "";
    if (!confirm(`Delete "${item.title}"?${extra}`)) return;

    setActionError(null);
    try {
      await apiDelete(`/content-items/${item.id}`);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not delete this content item.");
    }
  }

  const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="w-full max-w-full space-y-4 overflow-x-hidden sm:space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 sm:h-11 sm:w-11">
            <CalendarDays size={20} />
          </span>
          <div>
            <h1 className="text-base font-semibold text-navy-900 sm:text-lg">Content calendar</h1>
            <p className="hidden text-sm text-navy-400 sm:block">Every client&apos;s planned content, one month at a time.</p>
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
                <Plus size={16} /> <span className="hidden sm:inline">New content item</span>
                <span className="sm:hidden">New</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex w-full min-w-0 flex-col gap-3 rounded-2xl bg-white p-3 shadow-[0_2px_10px_rgba(15,23,42,0.06)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:flex-nowrap">
        <div className="flex items-center justify-between gap-1.5 sm:justify-start">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMonth((m) => addMonths(m, -1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-navy-100 text-navy-500 transition-colors hover:border-orange/40 hover:bg-orange/5 hover:text-orange"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="w-32 text-center text-sm font-semibold text-navy-900 sm:w-40">{monthLabel}</span>
            <button
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-navy-100 text-navy-500 transition-colors hover:border-orange/40 hover:bg-orange/5 hover:text-orange"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            onClick={() => setMonth(startOfMonth(new Date()))}
            className="rounded-full border border-navy-100 px-3 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50"
          >
            Today
          </button>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial">
          <Filter size={14} className="hidden shrink-0 text-navy-400 sm:block" />
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full min-w-0 rounded-lg border border-navy-100 bg-[#eef1fb] px-2.5 py-1.5 text-sm text-navy-700 sm:w-40 lg:w-auto"
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showForm && canCreate && (
        <NewContentItemForm
          clients={clients}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {actionError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
      )}

      {/* Calendar grid */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)]">
        <div className="grid grid-cols-7 border-b border-navy-100 bg-gradient-to-r from-[#eef1fb] to-[#e7ecfb]">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className="px-1 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-navy-400 sm:px-2">
              <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
              <span className="hidden sm:inline">{w}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {gridDays.map((day) => {
            const key = toDateKey(day);
            const inMonth = day.getUTCMonth() === month.getUTCMonth();
            const dayItems = itemsByDay.get(key) ?? [];
            const isToday = key === todayKey;
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(dayItems.length > 0 ? key : null)}
                className={`min-h-[62px] min-w-0 border-b border-r border-navy-50 p-1 text-left align-top last:border-r-0 sm:min-h-[110px] sm:p-2 ${
                  inMonth ? "bg-white" : "bg-navy-50/30"
                } hover:bg-[#eef1fb]/70`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium sm:h-6 sm:w-6 sm:text-[11px] ${
                    isToday ? "bg-orange font-bold text-white shadow-sm shadow-orange/30" : inMonth ? "text-navy-600" : "text-navy-300"
                  }`}
                >
                  {day.getUTCDate()}
                </span>

                {/* Mobile: compact dots */}
                {dayItems.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                    {dayItems.slice(0, 4).map((item) => (
                      <span
                        key={item.id}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: item.client?.brandColor ?? "#7F94BF" }}
                      />
                    ))}
                  </div>
                )}

                {/* Desktop: labeled chips */}
                <div className="mt-1 hidden space-y-0.5 sm:block">
                  {dayItems.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: item.client?.brandColor ?? "#7F94BF" }}
                      title={item.title}
                    >
                      {item.title}
                    </div>
                  ))}
                  {dayItems.length > 3 && <div className="text-[10px] font-medium text-navy-400">+{dayItems.length - 3} more</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {loading && <p className="text-sm text-navy-300">Loading...</p>}

      {selectedDay && (
        <DayPanel
          dateKey={selectedDay}
          items={itemsByDay.get(selectedDay) ?? []}
          canEdit={canEdit}
          onEdit={(item) => setEditingItem(item)}
          onDelete={deleteItem}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {editingItem && (
        <EditContentItemForm
          item={editingItem}
          onSaved={() => {
            setEditingItem(null);
            load();
          }}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

function DayPanel({
  dateKey,
  items,
  canEdit,
  onEdit,
  onDelete,
  onClose,
}: {
  dateKey: string;
  items: ContentItem[];
  canEdit: boolean;
  onEdit: (item: ContentItem) => void;
  onDelete: (item: ContentItem) => void;
  onClose: () => void;
}) {
  const label = new Date(dateKey).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-navy-950/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.35)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-navy-900">{label}</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-navy-400 hover:bg-navy-50 hover:text-navy-700"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-navy-100 p-3 transition-shadow hover:shadow-[0_2px_10px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.client?.brandColor ?? "#94a3b8" }} />
                  <span className="truncate text-sm font-semibold text-navy-900">{item.title}</span>
                </div>
                <span className="shrink-0 text-xs text-navy-400">{item.client?.name}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-navy-400">
                <span className="rounded-full bg-navy-50 px-2 py-0.5 font-medium text-navy-600">{item.channel}</span>
                <span>{item.format}</span>
                <span className="rounded-full bg-navy-50 px-2 py-0.5 font-medium capitalize text-navy-600">
                  {statusLabel(item.status)}
                </span>
              </div>
              {item.deliverables && item.deliverables.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {item.deliverables.map((d) => (
                    <li key={d.id} className="text-xs">
                      <Link href={`/deliverables/${d.id}`} className="font-medium text-orange hover:underline">
                        {d.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {canEdit && (
                <div className="mt-2.5 flex items-center gap-1 border-t border-navy-50 pt-2">
                  <button
                    onClick={() => onEdit(item)}
                    title="Edit content item"
                    className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-navy-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(item)}
                    title="Delete content item"
                    className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-navy-500 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditContentItemForm({
  item,
  onSaved,
  onClose,
}: {
  item: ContentItem;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [channel, setChannel] = useState(item.channel as string);
  const [format, setFormat] = useState(item.format);
  const [publishDate, setPublishDate] = useState(toDateKey(new Date(item.publishDate)));
  const [status, setStatus] = useState(item.status as string);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !format.trim() || !publishDate) {
      setError("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    try {
      await apiPatch(`/content-items/${item.id}`, {
        title: title.trim(),
        channel,
        format: format.trim(),
        publishDate: new Date(publishDate).toISOString(),
        status,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save changes.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.35)] sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-navy-900">Edit content item</h2>
            {item.client?.name && <p className="truncate text-xs text-navy-400">{item.client.name}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-navy-400 hover:bg-navy-50 hover:text-navy-700"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <div>
            <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className="input mt-1 w-full" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Channel</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value)} required className="input mt-1 w-full capitalize">
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Format</label>
              <input
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder="e.g. Carousel"
                required
                className="input mt-1 w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Publish date</label>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                required
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} required className="input mt-1 w-full capitalize">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-accent flex items-center justify-center gap-1.5">
            {submitting ? "Saving..." : "Save changes"}
          </button>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </form>
      </div>
    </div>
  );
}

function NewContentItemForm({ clients, onCreated }: { clients: Client[]; onCreated: () => void }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [format, setFormat] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!clientId && clients[0]) setClientId(clients[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost("/content-items", {
        clientId,
        title: title.trim(),
        channel,
        format: format.trim(),
        publishDate: new Date(publishDate).toISOString(),
      });
      setTitle("");
      setFormat("");
      setPublishDate("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create this content item.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.06)] sm:grid-cols-5"
    >
      <select value={clientId} onChange={(e) => setClientId(e.target.value)} required className="input">
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required className="input sm:col-span-2" />
      <select value={channel} onChange={(e) => setChannel(e.target.value)} className="input">
        {CHANNELS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input value={format} onChange={(e) => setFormat(e.target.value)} placeholder="Format (e.g. Carousel)" required className="input" />
      <input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} required className="input" />
      <button type="submit" disabled={submitting || clients.length === 0} className="btn-accent flex items-center justify-center gap-1.5">
        <Plus size={16} />
        {submitting ? "Saving..." : "Add to calendar"}
      </button>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-5">{error}</p>}
      {clients.length === 0 && <p className="text-xs text-navy-400 sm:col-span-5">Add a client first before scheduling content.</p>}
    </form>
  );
}