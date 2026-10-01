"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronDown, ChevronRight, LayoutList, Columns3, Plus, Trash2, CalendarDays } from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { notifyHierarchyChanged } from "@/lib/hierarchy";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import type { AssignableUser, Deliverable, ListDetail, Stage } from "@/lib/types";

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-navy-50 text-navy-500",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-orange-50 text-orange-700",
  urgent: "bg-red-50 text-red-700",
};

type View = "list" | "board";

export default function ListPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canCreate = user?.role === "admin" || user?.role === "manager" || user?.role === "team_member";
  // Admins and managers must pick an assignee. A team member's own task is assigned to them automatically.
  const needsAssignee = user?.role === "admin" || user?.role === "manager";

  const [list, setList] = useState<ListDetail | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [tasks, setTasks] = useState<Deliverable[]>([]);
  const [people, setPeople] = useState<AssignableUser[]>([]);
  const [view, setView] = useState<View>("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);

  // quick-add form
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const [listRes, stagesRes, tasksRes, peopleRes] = await Promise.all([
        apiGet<{ list: ListDetail }>(`/lists/${id}`),
        apiGet<{ stages: Stage[] }>("/stages"),
        apiGet<{ deliverables: Deliverable[] }>(`/deliverables?listId=${id}`),
        apiGet<{ users: AssignableUser[] }>("/users/assignable").catch(() => ({ users: [] as AssignableUser[] })),
      ]);
      setList(listRes.list);
      setStages([...stagesRes.stages].sort((a, b) => a.order - b.order));
      setTasks(tasksRes.deliverables);
      setPeople(peopleRes.users);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this list.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Build the subtask tree. A subtask whose parent isn't visible to this user is treated as a top-level row.
  const { roots, childrenOf } = useMemo(() => {
    const byId = new Set(tasks.map((t) => t.id));
    const kids = new Map<string, Deliverable[]>();
    const top: Deliverable[] = [];
    for (const t of tasks) {
      if (t.parentId && byId.has(t.parentId)) {
        kids.set(t.parentId, [...(kids.get(t.parentId) ?? []), t]);
      } else {
        top.push(t);
      }
    }
    return { roots: top, childrenOf: kids };
  }, [tasks]);

  const firstStageId = stages[0]?.id;

  async function addTask(e: FormEvent) {
    e.preventDefault();
    if (!firstStageId || !user) return;
    if (!title.trim() || !dueDate || (needsAssignee && !assigneeId)) {
      setError(
        needsAssignee
          ? "Please enter a title, choose an assignee and pick a due date."
          : "Please enter a title and pick a due date.",
      );
      return;
    }
    setAdding(true);
    setError(null);
    try {
      await apiPost("/deliverables", {
        title: title.trim(),
        listId: id,
        stageId: firstStageId,
        ownerId: user.id,
        priority,
        dueDate: dueDate || undefined,
        assigneeIds: assigneeId ? [assigneeId] : [],
      });
      setTitle("");
      setAssigneeId("");
      setDueDate("");
      setPriority("medium");
      await load();
      notifyHierarchyChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add that task.");
    } finally {
      setAdding(false);
    }
  }

  async function addSubtask(parentId: string, subtaskTitle: string) {
    if (!subtaskTitle.trim() || !firstStageId || !user) return;
    setError(null);
    try {
      await apiPost("/deliverables", {
        title: subtaskTitle.trim(),
        parentId,
        listId: id,
        stageId: firstStageId,
        ownerId: user.id,
      });
      setExpanded((p) => ({ ...p, [parentId]: true }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add that subtask.");
    }
  }

  async function moveTo(taskId: string, stageId: string) {
    setError(null);
    try {
      await apiPatch(`/deliverables/${taskId}`, { stageId });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not move this task.");
    }
  }

  async function removeTask(taskId: string) {
    if (!confirm("Delete this task and its subtasks? This can't be undone.")) return;
    setError(null);
    try {
      await apiDelete(`/deliverables/${taskId}`);
      await load();
      notifyHierarchyChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete this task.");
    }
  }

  if (loading) return <p className="text-sm text-navy-300">Loading...</p>;
  if (!list) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error ?? "List not found."}</p>;

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1 text-xs text-navy-400">
            <Link href={`/spaces/${list.space.id}`} className="hover:text-navy-700">{list.space.name}</Link>
            {list.folder && (
              <>
                <ChevronRight size={12} />
                <span>{list.folder.name}</span>
              </>
            )}
          </p>
          <h1 className="truncate text-lg font-semibold text-navy-900">{list.name}</h1>
          <p className="text-sm text-navy-400">{roots.length} task{roots.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex rounded-lg border border-navy-100 bg-white p-0.5 text-sm">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${view === "list" ? "bg-navy text-white" : "text-navy-600 hover:bg-navy-50"}`}
          >
            <LayoutList size={14} /> List
          </button>
          <button
            onClick={() => setView("board")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${view === "board" ? "bg-navy text-white" : "text-navy-600 hover:bg-navy-50"}`}
          >
            <Columns3 size={14} /> Board
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Quick add */}
      {canCreate && (
        <form onSubmit={addTask} className="card flex flex-wrap items-center gap-2 p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task and press Enter" className="input min-w-[200px] flex-1" />
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            required={needsAssignee}
            className="input w-auto"
          >
            <option value="" disabled={needsAssignee}>
              {needsAssignee ? "Select assignee" : "Assign to me"}
            </option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value as (typeof PRIORITIES)[number])} className="input w-auto capitalize">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="input w-auto" />
          <button
            type="submit"
            disabled={adding || !title.trim() || !dueDate || (needsAssignee && !assigneeId)}
            className="btn-accent"
          >
            <Plus size={14} /> {adding ? "Adding..." : "Add task"}
          </button>
        </form>
      )}

      {view === "list" ? (
        <div className="space-y-4">
          {stages.map((stage) => {
            const rows = roots.filter((t) => t.stageId === stage.id);
            return (
              <section key={stage.id} className="card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-navy-100 bg-navy-50/60 px-4 py-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-navy-600">{stage.label}</h2>
                  <span className="text-xs text-navy-300">{rows.length}</span>
                </div>
                {rows.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-navy-300">Nothing here.</p>
                ) : (
                  <ul className="divide-y divide-navy-50">
                    {rows.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        depth={0}
                        childrenOf={childrenOf}
                        stages={stages}
                        expanded={expanded}
                        setExpanded={setExpanded}
                        canCreate={canCreate}
                        onMove={moveTo}
                        onDelete={removeTask}
                        onAddSubtask={addSubtask}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {stages.map((stage) => {
            const cards = roots.filter((t) => t.stageId === stage.id);
            return (
              <div
                key={stage.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragId) moveTo(dragId, stage.id);
                  setDragId(null);
                }}
                className="w-72 shrink-0 rounded-xl bg-navy-50/70 p-2"
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-navy-600">{stage.label}</h2>
                  <span className="text-xs text-navy-300">{cards.length}</span>
                </div>
                <div className="space-y-2">
                  {cards.map((t) => {
                    const subs = childrenOf.get(t.id) ?? [];
                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={() => setDragId(t.id)}
                        className="card cursor-grab p-3 active:cursor-grabbing"
                      >
                        <Link href={`/deliverables/${t.id}`} className="text-sm font-medium text-navy-900 hover:text-orange">
                          {t.title}
                        </Link>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className={`badge capitalize ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
                          {t.dueDate && (
                            <span className="flex items-center gap-1 text-navy-400">
                              <CalendarDays size={12} /> {formatDate(t.dueDate)}
                            </span>
                          )}
                          {subs.length > 0 && <span className="text-navy-400">{subs.filter((s) => s.stage?.stageType === "done").length}/{subs.length} subtasks</span>}
                        </div>
                        {t.assignees.length > 0 && (
                          <div className="mt-2 flex -space-x-1">
                            {t.assignees.map((a) => (
                              <span key={a.id} title={a.user.name} className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-navy-200 text-[10px] font-semibold text-navy-700">
                                {a.user.name[0]?.toUpperCase()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {cards.length === 0 && <p className="px-2 py-3 text-xs text-navy-300">Drop a task here</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  depth,
  childrenOf,
  stages,
  expanded,
  setExpanded,
  canCreate,
  onMove,
  onDelete,
  onAddSubtask,
}: {
  task: Deliverable;
  depth: number;
  childrenOf: Map<string, Deliverable[]>;
  stages: Stage[];
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  canCreate: boolean;
  onMove: (id: string, stageId: string) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (parentId: string, title: string) => Promise<void>;
}) {
  const kids = childrenOf.get(task.id) ?? [];
  const open = !!expanded[task.id];
  const [subTitle, setSubTitle] = useState("");
  const doneKids = kids.filter((k) => k.stage?.stageType === "done").length;

  return (
    <li>
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 hover:bg-navy-50/40" style={{ paddingLeft: 16 + depth * 24 }}>
        <button
          onClick={() => setExpanded((p) => ({ ...p, [task.id]: !open }))}
          aria-label={open ? "Hide subtasks" : "Show subtasks"}
          className="text-navy-300 hover:text-navy-700"
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <Link href={`/deliverables/${task.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-navy-900 hover:text-orange">
          {task.title}
        </Link>
        {kids.length > 0 && <span className="text-xs text-navy-400">{doneKids}/{kids.length}</span>}
        <div className="flex -space-x-1">
          {task.assignees.map((a) => (
            <span key={a.id} title={a.user.name} className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-navy-200 text-[10px] font-semibold text-navy-700">
              {a.user.name[0]?.toUpperCase()}
            </span>
          ))}
        </div>
        {task.dueDate && <span className="text-xs text-navy-400">{formatDate(task.dueDate)}</span>}
        <span className={`badge capitalize ${PRIORITY_COLOR[task.priority]}`}>{task.priority}</span>
        <select value={task.stageId} onChange={(e) => onMove(task.id, e.target.value)} className="rounded-lg border border-navy-100 bg-white px-2 py-1 text-xs text-navy-600">
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        {canCreate && (
          <button onClick={() => onDelete(task.id)} aria-label="Delete task" className="text-navy-300 hover:text-red-600">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {open && (
        <div>
          <ul className="divide-y divide-navy-50">
            {kids.map((k) => (
              <TaskRow
                key={k.id}
                task={k}
                depth={depth + 1}
                childrenOf={childrenOf}
                stages={stages}
                expanded={expanded}
                setExpanded={setExpanded}
                canCreate={canCreate}
                onMove={onMove}
                onDelete={onDelete}
                onAddSubtask={onAddSubtask}
              />
            ))}
          </ul>
          {canCreate && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onAddSubtask(task.id, subTitle);
                setSubTitle("");
              }}
              className="flex gap-2 py-2 pr-4"
              style={{ paddingLeft: 40 + depth * 24 }}
            >
              <input value={subTitle} onChange={(e) => setSubTitle(e.target.value)} placeholder="Add a subtask" className="input flex-1 py-1.5 text-xs" />
              <button type="submit" className="btn-secondary px-2.5 py-1 text-xs">Add</button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}