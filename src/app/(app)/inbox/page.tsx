"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox as InboxIcon } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { AppNotification } from "@/lib/types";

export default function InboxPage() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await apiGet<{ notifications: AppNotification[] }>("/notifications");
      setItems(res.notifications);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function open(n: AppNotification) {
    if (!n.read) await apiPost(`/notifications/${n.id}/read`).catch(() => undefined);
    if (n.link) router.push(n.link);
    else load();
  }

  async function markAll() {
    await apiPost("/notifications/read-all");
    load();
  }

  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-50 text-navy-600"><InboxIcon size={20} /></span>
          <div>
            <h1 className="text-lg font-semibold text-navy-900">Inbox</h1>
            <p className="text-sm text-navy-400">{unread} unread</p>
          </div>
        </div>
        {unread > 0 && <button onClick={markAll} className="btn-secondary">Mark all read</button>}
      </div>

      {loading ? (
        <p className="text-sm text-navy-300">Loading...</p>
      ) : items.length === 0 ? (
        <p className="card p-6 text-center text-sm text-navy-300">You&apos;re all caught up.</p>
      ) : (
        <ul className="card divide-y divide-navy-50">
          {items.map((n) => (
            <li key={n.id}>
              <button onClick={() => open(n)} className={`block w-full px-4 py-3 text-left hover:bg-navy-50/50 ${n.read ? "" : "bg-orange-50/40"}`}>
                <p className={`text-sm ${n.read ? "text-navy-600" : "font-semibold text-navy-900"}`}>{n.title}</p>
                {n.body && <p className="mt-0.5 text-xs text-navy-400">{n.body}</p>}
                <p className="mt-1 text-[11px] text-navy-300">{formatDateTime(n.createdAt)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}