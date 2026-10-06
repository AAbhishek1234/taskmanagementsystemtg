"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Trash2, UserPlus } from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AssetsPanel } from "@/components/AssetsPanel";
import type { AssignableUser, Comment, Deliverable, Stage } from "@/lib/types";

const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-navy-50 text-navy-500",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-orange-50 text-orange-700",
  urgent: "bg-red-50 text-red-700",
};

export default function DeliverableDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [people, setPeople] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [newChecklistName, setNewChecklistName] = useState("");
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({});
  const [newComment, setNewComment] = useState("");
  const [commentVisibility, setCommentVisibility] = useState<"internal" | "client_visible">(
    user?.role === "client" ? "client_visible" : "internal",
  );
  const [addAssigneeId, setAddAssigneeId] = useState("");
  const [assigning, setAssigning] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [dRes, cRes, pRes, sRes] = await Promise.all([
        apiGet<{ deliverable: Deliverable }>(`/deliverables/${id}`),
        apiGet<{ comments: Comment[] }>(`/deliverables/${id}/comments`),
        apiGet<{ users: AssignableUser[] }>("/users/assignable").catch(() => ({ users: [] })),
        apiGet<{ stages: Stage[] }>("/stages").catch(() => ({ stages: [] as Stage[] })),
      ]);
      setStages([...sRes.stages].sort((a, b) => a.order - b.order));
      setDeliverable(dRes.deliverable);
      setComments(cRes.comments);
      setPeople(pRes.users);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this deliverable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addChecklist(e: FormEvent) {
    e.preventDefault();
    if (!newChecklistName.trim()) return;
    try {
      await apiPost(`/deliverables/${id}/checklists`, { name: newChecklistName.trim() });
      setNewChecklistName("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add that checklist.");
    }
  }

  async function deleteChecklist(checklistId: string) {
    if (!confirm("Delete this checklist and all its items?")) return;
    try {
      await apiDelete(`/deliverables/checklists/${checklistId}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete that checklist.");
    }
  }

  async function addChecklistItem(checklistId: string | null) {
    const key = checklistId ?? "legacy";
    const label = (itemDrafts[key] ?? "").trim();
    if (!label) return;
    try {
      await apiPost(`/deliverables/${id}/checklist-items`, { label, checklistId: checklistId ?? undefined });
      setItemDrafts((p) => ({ ...p, [key]: "" }));
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add that item.");
    }
  }

  async function deleteChecklistItem(itemId: string) {
    try {
      await apiDelete(`/deliverables/checklist-items/${itemId}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete that item.");
    }
  }

  async function addSubtask(e: FormEvent) {
    e.preventDefault();
    if (!newSubtask.trim() || !stages[0] || !user) return;
    try {
      await apiPost("/deliverables", {
        title: newSubtask.trim(),
        parentId: id,
        stageId: stages[0].id,
        ownerId: user.id,
      });
      setNewSubtask("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add that subtask.");
    }
  }

  async function moveSubtask(subtaskId: string, stageId: string) {
    try {
      await apiPatch(`/deliverables/${subtaskId}`, { stageId });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not move that subtask.");
    }
  }

  async function toggleChecklistItem(itemId: string, done: boolean) {
    await apiPatch(`/deliverables/checklist-items/${itemId}`, { done });
    load();
  }

  async function postComment(e: FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await apiPost(`/deliverables/${id}/comments`, { body: newComment, visibility: commentVisibility });
      setNewComment("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not post that comment.");
    }
  }

  async function addAssignee(e: FormEvent) {
    e.preventDefault();
    if (!addAssigneeId) return;
    setAssigning(true);
    setError(null);
    try {
      await apiPost(`/deliverables/${id}/assignees`, { userId: addAssigneeId });
      setAddAssigneeId("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not assign this person.");
    } finally {
      setAssigning(false);
    }
  }

  const canEdit = user?.role === "admin" || user?.role === "manager" || user?.role === "team_member" || user?.role === "freelancer";
  const canAssign = user?.role === "admin" || user?.role === "manager" || user?.role === "team_member";

  if (loading) return <p className="text-sm text-navy-300">Loading...</p>;
  if (error && !deliverable) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (!deliverable) return null;

  const assignedIds = new Set(deliverable.assignees.map((a) => a.user.id));
  const availablePeople = people.filter((p) => !assignedIds.has(p.id));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {(deliverable.list || (deliverable.ancestors ?? []).length > 0) && (
        <nav className="flex flex-wrap items-center gap-1 text-xs text-navy-400">
          {deliverable.list && (
            <>
              <span>{(deliverable.list as { space?: { name: string } }).space?.name}</span>
              {(deliverable.list as { folder?: { name: string } | null }).folder && (
                <>
                  <ChevronRight size={12} />
                  <span>{(deliverable.list as { folder?: { name: string } | null }).folder?.name}</span>
                </>
              )}
              <ChevronRight size={12} />
              <Link href={`/lists/${deliverable.list.id}`} className="hover:text-navy-700">{deliverable.list.name}</Link>
            </>
          )}
          {(deliverable.ancestors ?? []).map((a) => (
            <span key={a.id} className="flex items-center gap-1">
              <ChevronRight size={12} />
              <Link href={`/deliverables/${a.id}`} className="hover:text-navy-700">{a.title}</Link>
            </span>
          ))}
        </nav>
      )}

      <div className="card p-5">
        <h1 className="text-lg font-semibold text-navy-900">{deliverable.title}</h1>
        {deliverable.contentItem && <p className="text-sm text-navy-400">Part of: {deliverable.contentItem.title}</p>}
        {deliverable.description && <p className="mt-2 text-sm text-navy-600">{deliverable.description}</p>}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="badge bg-navy-50 text-navy-600">{deliverable.stage?.label}</span>
          <span className={`badge ${PRIORITY_STYLE[deliverable.priority]}`}>{deliverable.priority}</span>
          {deliverable.dueDate && <span className="badge bg-navy-50 text-navy-600">Due {new Date(deliverable.dueDate).toLocaleDateString()}</span>}
        </div>

        {/* Assignees */}
        <div className="mt-4 border-t border-navy-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Assigned to</p>
          {deliverable.assignees.length === 0 ? (
            <p className="mt-1 text-sm text-navy-400">Nobody yet</p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {deliverable.assignees.map((a) => (
                <span
                  key={a.user.id}
                  className="flex items-center gap-1.5 rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-700"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-200 text-[9px] font-semibold text-navy-700">
                    {a.user.name[0]?.toUpperCase()}
                  </span>
                  {a.user.name}
                </span>
              ))}
            </div>
          )}

          {canAssign && (
            <form onSubmit={addAssignee} className="mt-3 flex items-center gap-2">
              <select
                value={addAssigneeId}
                onChange={(e) => setAddAssigneeId(e.target.value)}
                className="input flex-1"
              >
                <option value="">
                  {availablePeople.length === 0 ? "No one else available" : "Add someone..."}
                </option>
                {availablePeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!addAssigneeId || assigning}
                className="btn-secondary flex shrink-0 items-center gap-1.5"
              >
                <UserPlus size={14} />
                {assigning ? "Adding..." : "Add"}
              </button>
            </form>
          )}
        </div>
      </div>

  
<AssetsPanel
  deliverableId={id}
  assigneeIds={deliverable.assignees.map((a) => a.user.id)}
/>

      {/* Subtasks (can nest to any depth: open a subtask to add its own) */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-navy-900">Subtasks</h2>
        <ul className="mt-2 divide-y divide-navy-50">
          {(deliverable.subtasks ?? []).map((st) => (
            <li key={st.id} className="flex items-center gap-2 py-2 text-sm">
              <Link href={`/deliverables/${st.id}`} className={`min-w-0 flex-1 truncate font-medium hover:text-orange ${st.stage?.stageType === "done" ? "text-navy-300 line-through" : "text-navy-800"}`}>
                {st.title}
              </Link>
              {st.assignees.map((a) => (
                <span key={a.id} title={a.user.name} className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-200 text-[9px] font-semibold text-navy-700">
                  {a.user.name[0]?.toUpperCase()}
                </span>
              ))}
              {canEdit ? (
                <select value={st.stageId} onChange={(e) => moveSubtask(st.id, e.target.value)} className="rounded-lg border border-navy-100 bg-white px-2 py-1 text-xs text-navy-600">
                  {stages.map((sg) => (
                    <option key={sg.id} value={sg.id}>{sg.label}</option>
                  ))}
                </select>
              ) : (
                <span className="badge bg-navy-50 text-navy-600">{st.stage?.label}</span>
              )}
            </li>
          ))}
          {(deliverable.subtasks ?? []).length === 0 && <p className="py-1 text-sm text-navy-300">No subtasks yet.</p>}
        </ul>
        {canEdit && (
          <form onSubmit={addSubtask} className="mt-3 flex gap-2">
            <input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} placeholder="Add a subtask" className="input flex-1" />
            <button type="submit" className="btn-secondary">Add</button>
          </form>
        )}
      </section>

      {/* Named checklists */}
      {(deliverable.checklists ?? []).map((group) => {
        const key = group.id ?? "legacy";
        const done = group.items.filter((i) => i.done).length;
        return (
          <section key={key} className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-navy-900">
                {group.name} <span className="ml-1 text-xs font-normal text-navy-400">{done}/{group.items.length}</span>
              </h2>
              {canEdit && group.id && (
                <button onClick={() => deleteChecklist(group.id!)} aria-label="Delete checklist" className="text-navy-300 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <ul className="mt-2 space-y-1.5">
              {group.items.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.done}
                    disabled={!canEdit}
                    onChange={(e) => toggleChecklistItem(item.id, e.target.checked)}
                    className="h-4 w-4 rounded border-navy-200 text-orange focus:ring-orange"
                  />
                  <span className={`flex-1 ${item.done ? "text-navy-300 line-through" : "text-navy-700"}`}>{item.label}</span>
                  {canEdit && (
                    <button onClick={() => deleteChecklistItem(item.id)} aria-label="Delete item" className="text-navy-200 hover:text-red-600">
                      <Trash2 size={12} />
                    </button>
                  )}
                </li>
              ))}
              {group.items.length === 0 && <p className="text-sm text-navy-300">No items yet.</p>}
            </ul>
            {canEdit && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addChecklistItem(group.id);
                }}
                className="mt-3 flex gap-2"
              >
                <input
                  value={itemDrafts[key] ?? ""}
                  onChange={(e) => setItemDrafts((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder="Add an item"
                  className="input flex-1"
                />
                <button type="submit" className="btn-secondary">Add</button>
              </form>
            )}
          </section>
        );
      })}

      {canEdit && (
        <form onSubmit={addChecklist} className="card flex gap-2 p-4">
          <input value={newChecklistName} onChange={(e) => setNewChecklistName(e.target.value)} placeholder="New checklist name (e.g. QA)" className="input flex-1" />
          <button type="submit" className="btn-secondary">Add checklist</button>
        </form>
      )}

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-navy-900">Comments</h2>
        <p className="text-xs text-navy-300">
          {user?.role === "client" ? "Only comments meant for clients appear here." : "Internal notes are never shown to clients."}
        </p>
        <ul className="mt-3 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-navy-800">{c.author.name}</span>
                {c.visibility === "internal" && <span className="badge bg-navy-50 text-navy-500">Internal</span>}
                <span className="text-xs text-navy-300">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-0.5 text-navy-600">{c.body}</p>
            </li>
          ))}
          {comments.length === 0 && <p className="text-sm text-navy-300">No comments yet.</p>}
        </ul>

        <form onSubmit={postComment} className="mt-4 space-y-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows={2}
            className="input"
          />
          <div className="flex items-center justify-between">
            {user?.role !== "client" ? (
              <select
                value={commentVisibility}
                onChange={(e) => setCommentVisibility(e.target.value as "internal" | "client_visible")}
                className="rounded-lg border border-navy-100 px-2 py-1 text-xs text-navy-600"
              >
                <option value="internal">Internal only</option>
                <option value="client_visible">Visible to client</option>
              </select>
            ) : (
              <span className="text-xs text-navy-300">Visible to your account team</span>
            )}
            <button type="submit" className="btn-accent">
              Post
            </button>
          </div>
        </form>
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>
    </div>
  );
}