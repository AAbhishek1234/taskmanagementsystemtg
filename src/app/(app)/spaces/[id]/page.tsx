"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Folder as FolderIcon, ListChecks, Plus } from "lucide-react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { notifyHierarchyChanged } from "@/lib/hierarchy";
import { useAuth } from "@/context/AuthContext";
import type { Deliverable, ListNode, SpaceNode } from "@/lib/types";

export default function SpacePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";

  const [space, setSpace] = useState<SpaceNode | null>(null);
  const [tasks, setTasks] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<null | { kind: "folder" } | { kind: "list"; folderId: string | null }>(null);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    try {
      const [treeRes, tasksRes] = await Promise.all([
        apiGet<{ spaces: SpaceNode[] }>("/spaces/tree"),
        apiGet<{ deliverables: Deliverable[] }>(`/deliverables?spaceId=${id}`),
      ]);
      setSpace(treeRes.spaces.find((s) => s.id === id) ?? null);
      setTasks(tasksRes.deliverables.filter((t) => !t.parentId));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this space.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!adding || !name.trim()) return;
    try {
      if (adding.kind === "folder") await apiPost("/folders", { spaceId: id, name: name.trim() });
      else await apiPost("/lists", { spaceId: id, folderId: adding.folderId, name: name.trim() });
      setAdding(null);
      setName("");
      await load();
      notifyHierarchyChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save that.");
    }
  }

  if (loading) return <p className="text-sm text-navy-300">Loading...</p>;
  if (!space) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error ?? "Space not found."}</p>;

  const listCard = (l: ListNode) => (
    <Link key={l.id} href={`/lists/${l.id}`} className="card flex items-center gap-2 p-3 hover:shadow-card-hover">
      <ListChecks size={16} className="text-navy-300" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy-800">{l.name}</span>
      <span className="text-xs text-navy-400">{l.taskCount} task{l.taskCount === 1 ? "" : "s"}</span>
    </Link>
  );

  const addBox = (
    <form onSubmit={submit} className="card flex gap-2 p-3">
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${adding?.kind} name`} className="input flex-1" />
      <button type="submit" className="btn-accent">Create</button>
      <button type="button" onClick={() => setAdding(null)} className="btn-secondary">Cancel</button>
    </form>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg text-base font-bold text-white" style={{ backgroundColor: space.color ?? "#4c68a0" }}>
            {space.name[0]?.toUpperCase()}
          </span>
          <div>
            <h1 className="text-lg font-semibold text-navy-900">{space.name}</h1>
            <p className="text-sm text-navy-400">{space.folders.length} folders &middot; {space.lists.length + space.folders.reduce((n, f) => n + f.lists.length, 0)} lists</p>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button onClick={() => { setName(""); setAdding({ kind: "folder" }); }} className="btn-secondary"><Plus size={14} /> Folder</button>
            <button onClick={() => { setName(""); setAdding({ kind: "list", folderId: null }); }} className="btn-secondary"><Plus size={14} /> List</button>
          </div>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {adding && adding.kind === "folder" && addBox}
      {adding && adding.kind === "list" && adding.folderId === null && addBox}

      {space.folders.map((folder) => (
        <section key={folder.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-800">
              <FolderIcon size={16} className="text-navy-300" /> {folder.name}
            </h2>
            {canManage && (
              <button onClick={() => { setName(""); setAdding({ kind: "list", folderId: folder.id }); }} className="text-xs font-medium text-navy-500 hover:text-orange">
                + List
              </button>
            )}
          </div>
          {adding && adding.kind === "list" && adding.folderId === folder.id && addBox}
          <div className="grid gap-2 sm:grid-cols-2">
            {folder.lists.map(listCard)}
            {folder.lists.length === 0 && <p className="text-sm text-navy-300">No lists in this folder yet.</p>}
          </div>
        </section>
      ))}

      {space.lists.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-navy-800">Lists in this Space</h2>
          <div className="grid gap-2 sm:grid-cols-2">{space.lists.map(listCard)}</div>
        </section>
      )}

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-navy-900">All tasks in {space.name}</h2>
        {tasks.length === 0 ? (
          <p className="mt-2 text-sm text-navy-300">No tasks yet. Open a List to add one.</p>
        ) : (
          <ul className="mt-2 divide-y divide-navy-50">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
                <Link href={`/deliverables/${t.id}`} className="min-w-0 flex-1 truncate font-medium text-navy-800 hover:text-orange">{t.title}</Link>
                {t.list && <span className="text-xs text-navy-400">{t.list.name}</span>}
                <span className="badge bg-navy-50 text-navy-600">{t.stage?.label}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
