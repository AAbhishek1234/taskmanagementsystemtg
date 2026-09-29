"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  ArrowRight,
  X,
  CalendarRange,
} from "lucide-react";
import { apiGet, apiPatch, ApiError } from "@/lib/api";
import type { PublishingStatusItem, PublishingStatusResponse } from "@/lib/types";

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}
function todayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const STATUS_META: Record<PublishingStatusItem["computed"], { label: string; dot: string; cell: string }> = {
  published: { label: "Published", dot: "bg-emerald-500", cell: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  delayed: { label: "Delayed", dot: "bg-red-500", cell: "bg-red-50 text-red-700 border-red-200" },
  scheduled: { label: "Scheduled", dot: "bg-orange-400", cell: "bg-orange-50 text-orange-700 border-orange-200" },
};

type Preset = "last7" | "this_week" | "next7" | "custom";

export default function PublishingStatusPage() {
  const [preset, setPreset] = useState<Preset>("last7");
  const [customFrom, setCustomFrom] = useState(toDateKey(addDays(todayUtc(), -3)));
  const [customTo, setCustomTo] = useState(toDateKey(addDays(todayUtc(), 3)));
  const [data, setData] = useState<PublishingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ clientName: string; dateKey: string; items: PublishingStatusItem[] } | null>(null);
  const [statusFilter, setStatusFilter] = useState<PublishingStatusItem["computed"] | null>(null);

  const range = useMemo(() => {
    const today = todayUtc();
    if (preset === "last7") return { from: toDateKey(addDays(today, -6)), to: toDateKey(today) };
    if (preset === "next7") return { from: toDateKey(today), to: toDateKey(addDays(today, 6)) };
    if (preset === "this_week") {
      const start = addDays(today, -today.getUTCDay());
      return { from: toDateKey(start), to: toDateKey(addDays(start, 6)) };
    }
    return { from: customFrom, to: customTo };
  }, [preset, customFrom, customTo]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from: range.from, to: range.to });
      const res = await apiGet<PublishingStatusResponse>(`/reports/publishing-status?${params.toString()}`);
      setData(res);
    } catch {
      setError("Could not load the publishing status report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  const counts = useMemo(() => {
    const totals = { published: 0, delayed: 0, scheduled: 0 };
    if (!data) return totals;
    for (const client of data.clients) {
      for (const date of data.dates) {
        for (const item of data.cells[client.id]?.[date] ?? []) {
          totals[item.computed] += 1;
        }
      }
    }
    return totals;
  }, [data]);

  // items in a cell that match the active filter (or all of them, with no filter)
  function visibleItems(items: PublishingStatusItem[]) {
    return statusFilter ? items.filter((i) => i.computed === statusFilter) : items;
  }

  return (
    <div className="w-full max-w-full space-y-4 overflow-x-clip sm:space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 sm:h-11 sm:w-11">
            <BarChart3 size={20} />
          </span>
          <div>
            <h1 className="text-base font-semibold text-navy-900 sm:text-lg">Publishing status</h1>
            <p className="text-sm text-navy-400">Every client, every posting date, at a glance.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["last7", "Last 7 days"],
              ["this_week", "This week"],
              ["next7", "Next 7 days"],
              ["custom", "Custom"],
            ] as [Preset, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setPreset(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                preset === value
                  ? "bg-navy-900 text-white shadow-sm"
                  : "border border-navy-100 text-navy-500 hover:border-orange/40 hover:bg-orange/5 hover:text-orange"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-[0_2px_10px_rgba(15,23,42,0.06)]">
          <CalendarRange size={14} className="text-navy-400" />
          <label className="text-sm text-navy-500">From</label>
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="input w-auto" />
          <label className="text-sm text-navy-500">To</label>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="input w-auto" />
        </div>
      )}

      {/* Legend / stat pills — click one to filter the grid to just that status */}
      <div className="flex flex-wrap gap-2.5">
        {(Object.keys(STATUS_META) as (keyof typeof STATUS_META)[]).map((key) => {
          const active = statusFilter === key;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter((prev) => (prev === key ? null : key))}
              className={`flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2 shadow-[0_2px_10px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 ${
                active ? "ring-2 ring-inset ring-navy-800" : ""
              }`}
            >
              <span className={`relative flex h-2.5 w-2.5 items-center justify-center`}>
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${STATUS_META[key].dot} opacity-40`} />
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${STATUS_META[key].dot}`} />
              </span>
              <span className="text-xs font-medium text-navy-500">{STATUS_META[key].label}</span>
              <span className="text-sm font-bold text-navy-900">{counts[key]}</span>
            </button>
          );
        })}
        {statusFilter && (
          <button
            onClick={() => setStatusFilter(null)}
            className="flex items-center gap-1 rounded-2xl border border-navy-100 px-3.5 py-2 text-xs font-medium text-navy-500 transition-colors hover:bg-navy-50"
          >
            <X size={12} /> Clear filter
          </button>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-white/60 shadow-[0_2px_10px_rgba(15,23,42,0.06)]" />
          ))}
        </div>
      ) : !data || data.clients.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-[0_2px_10px_rgba(15,23,42,0.06)]">
          <p className="text-sm text-navy-400">No clients visible for this view yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 border-b border-r border-navy-100 bg-gradient-to-r from-[#eef1fb] to-[#e7ecfb] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-navy-500">
                    Client
                  </th>
                  {data.dates.map((date) => {
                    const d = new Date(date);
                    const isToday = date === data.today;
                    return (
                      <th
                        key={date}
                        className={`border-b border-navy-100 px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide transition-colors ${
                          isToday ? "bg-orange-50 text-orange-700" : "bg-gradient-to-r from-[#eef1fb] to-[#e7ecfb] text-navy-500"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {d.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" })}
                          {isToday && <span className="h-1.5 w-1.5 rounded-full bg-orange" />}
                        </div>
                        <div className="text-[11px] font-normal normal-case text-navy-400">
                          {d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.clients.map((client) => (
                  <tr key={client.id} className="group">
                    <td className="sticky left-0 z-10 border-b border-r border-navy-50 bg-white px-3 py-2.5 transition-colors group-hover:bg-[#fafbff]">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: client.brandColor ?? "#7F94BF" }}
                        />
                        <span className="whitespace-nowrap font-medium text-navy-800">{client.name}</span>
                      </div>
                    </td>
                    {data.dates.map((date) => {
                      const allItems = data.cells[client.id]?.[date] ?? [];
                      const items = visibleItems(allItems);
                      if (items.length === 0) {
                        return (
                          <td
                            key={date}
                            className="border-b border-navy-50 px-2 py-2.5 text-center text-navy-200 transition-colors group-hover:bg-[#fafbff]"
                          >
                            &middot;
                          </td>
                        );
                      }
                      const worst: PublishingStatusItem["computed"] = items.some((i) => i.computed === "delayed")
                        ? "delayed"
                        : items.some((i) => i.computed === "scheduled")
                          ? "scheduled"
                          : "published";
                      return (
                        <td
                          key={date}
                          className="border-b border-navy-50 px-2 py-2.5 text-center transition-colors group-hover:bg-[#fafbff]"
                        >
                          <button
                            onClick={() => setSelectedCell({ clientName: client.name, dateKey: date, items })}
                            className={`inline-flex min-w-[32px] items-center justify-center rounded-lg border px-2 py-1 text-xs font-semibold transition-transform duration-150 hover:scale-110 active:scale-95 ${STATUS_META[worst].cell}`}
                          >
                            {items.length}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-navy-50 px-3 py-2 text-[11px] text-navy-300 sm:hidden">
            Scroll sideways to see more dates &rarr;
          </p>
        </div>
      )}

      {selectedCell && (
        <CellPanel
          cell={selectedCell}
          onClose={() => setSelectedCell(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function CellPanel({
  cell,
  onClose,
  onChanged,
}: {
  cell: { clientName: string; dateKey: string; items: PublishingStatusItem[] };
  onClose: () => void;
  onChanged: () => void;
}) {
  const label = new Date(cell.dateKey).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function markPublished(itemId: string) {
    setError(null);
    setUpdatingId(itemId);
    try {
      await apiPatch(`/content-items/${itemId}`, { status: "published" });
      onChanged();
      onClose(); // this cell's contents just changed; simplest is to close and let the grid refresh
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update this item.");
      setUpdatingId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-navy-950/40 p-0 backdrop-blur-[2px] duration-200 animate-in fade-in sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg origin-bottom overflow-y-auto rounded-t-2xl bg-white p-5 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.35)] duration-200 animate-in slide-in-from-bottom-4 sm:rounded-2xl sm:slide-in-from-bottom-0 sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-navy-900">{cell.clientName}</h3>
            <p className="text-xs text-navy-400">{label}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-navy-400 hover:bg-navy-50 hover:text-navy-700"
          >
            <X size={16} />
          </button>
        </div>

        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

        <div className="mt-3 space-y-2">
          {cell.items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-navy-100 p-3 transition-shadow hover:shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-navy-900">{item.title}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_META[item.computed].cell}`}>
                  {STATUS_META[item.computed].label}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-navy-400">
                <span className="rounded-full bg-navy-50 px-2 py-0.5 font-medium text-navy-600">{item.channel}</span>
                <span>{item.format}</span>
              </div>

              {item.computed !== "published" && (
                <button
                  onClick={() => markPublished(item.id)}
                  disabled={updatingId === item.id}
                  className="mt-2.5 w-full rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                >
                  {updatingId === item.id ? "Marking..." : "Mark as published"}
                </button>
              )}
            </div>
          ))}
        </div>
        <Link
          href="/calendar"
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-orange hover:underline"
        >
          View in calendar <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}