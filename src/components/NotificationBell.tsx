"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import type { AppNotification } from "@/lib/types";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_ICON: Record<string, string> = {
  "asset.uploaded": "\u{1F4E4}",
  "asset.reuploaded": "\u{1F504}",
  "asset.approved": "✅",
  "asset.changes_requested": "✏️",
  "asset.comment": "\u{1F4AC}",
  "task.assigned": "\u{1F4CC}",
  "task.stage_changed": "\u{27A1}\u{FE0F}",
  "task.updated": "\u{270F}\u{FE0F}",
  "task.due_soon": "\u{23F0}",
  "task.overdue": "\u{26A0}\u{FE0F}",
};

/** How many task rows the dropdown shows; everything else is one click away in the Inbox. */
const MAX_VISIBLE = 6;

/** Several notifications about the same task collapse into one row (newest first). */
interface NotificationGroup {
  key: string;
  latest: AppNotification;
  count: number;
  unreadIds: string[];
}

function groupByTask(items: AppNotification[]): NotificationGroup[] {
  const map = new Map<string, NotificationGroup>();
  for (const n of items) {
    const key = n.link ?? n.id;
    const group = map.get(key);
    if (!group) {
      map.set(key, { key, latest: n, count: 1, unreadIds: n.read ? [] : [n.id] });
    } else {
      group.count += 1;
      if (!n.read) group.unreadIds.push(n.id);
    }
  }
  return Array.from(map.values());
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function load() {
    try {
      const res = await apiGet<{ notifications: AppNotification[]; unreadCount: number }>("/notifications");
      setItems(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // notifications are a convenience, not critical — fail silently
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock body scroll on mobile when the panel is open (it renders as a sheet there)
  useEffect(() => {
    if (open && typeof window !== "undefined" && window.innerWidth < 640) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const groups = useMemo(() => groupByTask(items), [items]);
  const visible = groups.slice(0, MAX_VISIBLE);
  const hiddenCount = groups.length - visible.length;
  // The badge counts tasks with something new, not every individual notification.
  const unreadGroups = groups.filter((g) => g.unreadIds.length > 0).length;

  async function handleClick(g: NotificationGroup) {
    if (g.unreadIds.length > 0) {
      await Promise.all(g.unreadIds.map((id) => apiPost(`/notifications/${id}/read`).catch(() => undefined)));
      load();
    }
    setOpen(false);
    if (g.latest.link) router.push(g.latest.link);
  }

  async function markAllRead() {
    await apiPost("/notifications/read-all");
    load();
  }

  function openInbox() {
    setOpen(false);
    router.push("/inbox");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-navy-500 hover:bg-navy-50 active:bg-navy-100"
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadGroups > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange px-1 text-[10px] font-bold text-white">
            {unreadGroups > 9 ? "9+" : unreadGroups}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-20 bg-navy-900/20 sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel: bottom sheet on mobile, dropdown on sm+ */}
          <div
            className="
              fixed inset-x-0 bottom-0 z-30 flex max-h-[80vh] w-full flex-col rounded-t-2xl border-t border-navy-100 bg-white shadow-card-hover
              pb-[env(safe-area-inset-bottom,0px)]
              sm:absolute sm:inset-x-auto sm:right-0 sm:bottom-auto sm:top-full sm:mt-2 sm:max-h-[28rem] sm:w-96
              sm:rounded-xl sm:border sm:border-navy-100 sm:pb-0
              max-w-full sm:max-w-[calc(100vw-2rem)]
            "
          >
            <div className="flex shrink-0 items-center justify-between border-b border-navy-50 px-4 py-3 sm:py-2.5">
              <span className="text-sm font-semibold text-navy-900">Notifications</span>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs font-medium text-orange hover:underline">
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-navy-300 hover:bg-navy-50 sm:hidden"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {visible.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-navy-300">You&apos;re all caught up.</p>
              ) : (
                visible.map((g) => {
                  const n = g.latest;
                  const unread = g.unreadIds.length > 0;
                  return (
                    <button
                      key={g.key}
                      onClick={() => handleClick(g)}
                      className={`flex w-full gap-2.5 border-b border-navy-50 px-4 py-3.5 sm:py-3 text-left text-sm last:border-0 hover:bg-navy-50 active:bg-navy-100 ${
                        unread ? "bg-orange-50/40" : "bg-white"
                      }`}
                    >
                      <span className="mt-0.5 flex-shrink-0">{TYPE_ICON[n.type] ?? "\u{1F514}"}</span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`line-clamp-2 break-words ${
                            unread ? "font-semibold text-navy-900" : "font-normal text-navy-700"
                          }`}
                        >
                          {n.title}
                        </span>
                        {n.body && <span className="mt-0.5 block break-words text-xs text-navy-400">{n.body}</span>}
                        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-navy-300">
                          {timeAgo(n.createdAt)}
                          {g.count > 1 && (
                            <span className="rounded-full bg-navy-50 px-1.5 py-0.5 font-medium text-navy-500">
                              +{g.count - 1} earlier
                            </span>
                          )}
                        </span>
                      </span>
                      {unread && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-orange" />}
                    </button>
                  );
                })
              )}
            </div>

            <button
              onClick={openInbox}
              className="shrink-0 border-t border-navy-50 px-4 py-2.5 text-center text-xs font-medium text-orange hover:bg-navy-50"
            >
              {hiddenCount > 0 ? `View all in Inbox (${hiddenCount} more)` : "Open Inbox"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}