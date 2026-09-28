"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ClipboardList,
  ArrowLeft,
  ArrowRight,
  Users,
  CalendarDays,
  Plus,
  X,
  Trash2,
  Pencil,
} from "lucide-react";
import { apiGet, apiPatch, apiPost, apiDelete, ApiError } from "@/lib/api";
import type { AssignableUser, Client, Deliverable, Stage } from "@/lib/types";

const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-navy-50 text-navy-500",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-orange-50 text-orange-700",
  urgent: "bg-red-50 text-red-700",
};

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-navy-300",
  medium: "bg-blue-500",
  high: "bg-orange",
  urgent: "bg-red-500",
};

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

function isApprovedStage(label: string) {
  return label.trim().toLowerCase() === "approved";
}

export default function TasksPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [people, setPeople] = useState<AssignableUser[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Deliverable | null>(null);

  async function load() {
    setLoading(true);
    try {
      const query = assigneeFilter ? `?assigneeId=${assigneeFilter}` : "";
      const [stagesRes, deliverablesRes, peopleRes, clientsRes] = await Promise.all([
        apiGet<{ stages: Stage[] }>("/stages"),
        apiGet<{ deliverables: Deliverable[] }>(`/deliverables${query}`),
        apiGet<{ users: AssignableUser[] }>("/users/assignable"),
        apiGet<{ clients: Client[] }>("/clients"),
      ]);
      setStages(stagesRes.stages.sort((a, b) => a.order - b.order));
      setDeliverables(deliverablesRes.deliverables);
      setPeople(peopleRes.users);
      setClients(clientsRes.clients);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assigneeFilter]);

  const byStage = useMemo(() => {
    const map = new Map<string, Deliverable[]>();
    for (const d of deliverables) {
      const list = map.get(d.stageId) ?? [];
      list.push(d);
      map.set(d.stageId, list);
    }
    return map;
  }, [deliverables]);

  // Fallback for tasks that only have clientId (in case the API omits the
  // nested client object): look the name up from the clients list.
  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients) map.set(c.id, c.name);
    return map;
  }, [clients]);

  async function moveTo(deliverableId: string, stageId: string) {
    setMoveError(null);
    try {
      await apiPatch(`/deliverables/${deliverableId}`, { stageId });
      load();
    } catch (err) {
      setMoveError(err instanceof ApiError ? err.message : "Could not move this task.");
    }
  }

  async function deleteTask(deliverableId: string) {
    if (!confirm("Delete this task? This can't be undone.")) return;
    setMoveError(null);
    try {
      await apiDelete(`/deliverables/${deliverableId}`);
      load();
    } catch (err) {
      setMoveError(err instanceof ApiError ? err.message : "Could not delete this task.");
    }
  }

  const totalCount = deliverables.length;

  return (
    <div className="w-full max-w-full space-y-4 overflow-x-clip">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-purple-200 text-purple-600 sm:h-11 sm:w-11">
            <ClipboardList size={20} />
          </span>
          <div>
            <h1 className="text-base font-semibold text-navy-900 sm:text-lg">Tasks</h1>
            <p className="text-sm text-navy-400">
              Every deliverable you can see, grouped by stage
              {!loading && <span className="text-navy-500"> &middot; {totalCount} total</span>}
              .
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {people.length > 0 && (
            <div className="flex min-w-0 items-center gap-2">
              <Users size={14} className="hidden shrink-0 text-navy-400 sm:block" />
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="min-w-0 rounded-lg border border-navy-100 bg-[#eef1fb] px-2.5 py-1.5 text-sm text-navy-700"
              >
                <option value="">Everyone</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {stages.length > 0 && (
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
                  <Plus size={16} /> <span className="hidden sm:inline">New task</span>
                  <span className="sm:hidden">New</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {showForm && stages.length > 0 && (
        <NewTaskForm
          stages={stages}
          people={people}
          clients={clients}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
          onClose={() => setShowForm(false)}
        />
      )}

      {editingTask && (
        <EditTaskForm
          deliverable={editingTask}
          clients={clients}
          onSaved={() => {
            setEditingTask(null);
            load();
          }}
          onClose={() => setEditingTask(null)}
        />
      )}

      {moveError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{moveError}</p>
      )}

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 w-64 shrink-0 animate-pulse rounded-2xl bg-white/60 shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
            />
          ))}
        </div>
      ) : (
        <div className="-mx-4 flex items-start gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
          {stages.map((stage) => {
            const stageIndex = stages.findIndex((s) => s.id === stage.id);
            const prevStage = stages[stageIndex - 1];
            const nextStage = stages[stageIndex + 1];
            const cards = byStage.get(stage.id) ?? [];
            return (
              <div
                key={stage.id}
                className="flex w-[78vw] shrink-0 flex-col rounded-2xl bg-white/70 shadow-[0_2px_10px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:w-72"
              >
                <div className="flex items-center justify-between px-4 pt-3 pb-2.5">
                  <h2 className="text-sm font-semibold text-navy-800">{stage.label}</h2>
                  <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-navy-100 px-2 text-xs font-semibold text-navy-600">
                    {cards.length}
                  </span>
                </div>

                <div className="max-h-[calc(100vh-320px)] min-h-[7rem] flex-1 overflow-y-auto px-3 pb-3">
                  <div className="flex flex-col gap-2.5">
                    {cards.map((d) => {
                      const clientName =
                        d.client?.name ?? (d.clientId ? clientNameById.get(d.clientId) : undefined);
                      return (
                        <div
                          key={d.id}
                          className="rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-6px_rgba(15,23,42,0.18)]"
                        >
                          <div className="flex items-start gap-2">
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[d.priority]}`} />
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/deliverables/${d.id}`}
                                className="block truncate text-sm font-semibold leading-snug text-navy-900 hover:text-orange"
                              >
                                {d.title}
                              </Link>
                              {clientName && (
                                <p className="truncate text-xs font-medium text-navy-500">{clientName}</p>
                              )}
                              {d.description && (
                                <p className="mt-0.5 line-clamp-2 text-xs text-navy-400">{d.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 pl-4">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${PRIORITY_COLOR[d.priority]}`}>
                              {d.priority}
                            </span>
                            {d.dueDate && (
                              <span className="flex items-center gap-1 text-[10px] text-navy-400">
                                <CalendarDays size={10} />
                                {new Date(d.dueDate).toLocaleDateString()}
                              </span>
                            )}
                            {d.assignees.length > 0 && (
                              <span className="flex items-center gap-1">
                                <div className="flex -space-x-1.5">
                                  {d.assignees.slice(0, 3).map((a) => (
                                    <span
                                      key={a.user.id}
                                      title={a.user.name}
                                      className="flex h-4 w-4 items-center justify-center rounded-full border border-white bg-navy-100 text-[8px] font-semibold text-navy-600"
                                    >
                                      {a.user.name[0]?.toUpperCase()}
                                    </span>
                                  ))}
                                </div>
                                <span className="max-w-[6rem] truncate text-[10px] text-navy-400">
                                  {d.assignees.map((a) => a.user.name).join(", ")}
                                </span>
                              </span>
                            )}
                          </div>

                          <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-navy-50 pt-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditingTask(d)}
                                title="Edit task"
                                className="flex h-6 w-6 items-center justify-center rounded-md text-navy-300 transition-colors hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => deleteTask(d.id)}
                                title="Delete task"
                                className="flex h-6 w-6 items-center justify-center rounded-md text-navy-300 transition-colors hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {isApprovedStage(stage.label) ? (
                              <span className="text-[10px] font-medium text-emerald-700">✓ Locked</span>
                            ) : (
                              (prevStage || nextStage) && (
                                <div className="flex items-center gap-1">
                                  {prevStage && (
                                    <button
                                      onClick={() => moveTo(d.id, prevStage.id)}
                                      title={`Move to ${prevStage.label}`}
                                      className="flex h-6 w-6 items-center justify-center rounded-md text-navy-400 transition-colors hover:bg-orange/10 hover:text-orange"
                                    >
                                      <ArrowLeft size={13} />
                                    </button>
                                  )}
                                  {nextStage && (
                                    <button
                                      onClick={() => moveTo(d.id, nextStage.id)}
                                      title={`Move to ${nextStage.label}`}
                                      className="flex h-6 w-6 items-center justify-center rounded-md text-navy-400 transition-colors hover:bg-orange/10 hover:text-orange"
                                    >
                                      <ArrowRight size={13} />
                                    </button>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {cards.length === 0 && (
                      <div className="flex h-20 flex-col items-center justify-center rounded-xl border border-dashed border-navy-200 text-center">
                        <p className="text-xs text-navy-300">Nothing here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewTaskForm({
  stages,
  people,
  clients,
  onCreated,
  onClose,
}: {
  stages: Stage[];
  people: AssignableUser[];
  clients: Client[];
  onCreated: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [stageId, setStageId] = useState(stages[0]?.id ?? "");
  const [ownerId, setOwnerId] = useState(people[0]?.id ?? "");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // The client is linked directly (clientId). No calendar content item
      // is attached, so no calendar text leaks onto the task.
      await apiPost("/deliverables", {
        title,
        description: description || undefined,
        clientId: clientId || undefined,
        stageId,
        ownerId,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        assigneeIds,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create this task.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-navy-900">New task</h2>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-navy-400 hover:bg-navy-50 hover:text-navy-700"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Write carousel copy"
            required
            className="input mt-1 w-full"
          />
        </div>

        <div className="sm:col-span-3">
          <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Client</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="input mt-1 w-full"
          >
            <option value="">No client (internal task)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-6">
          <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="input mt-1 w-full resize-none"
          />
        </div>

        <div className="sm:col-span-3">
          <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Owner</label>
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} required className="input mt-1 w-full">
            {people.length === 0 && <option value="">No one available</option>}
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Stage</label>
          <select value={stageId} onChange={(e) => setStageId(e.target.value)} required className="input mt-1 w-full">
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as (typeof PRIORITIES)[number])}
            className="input mt-1 w-full capitalize"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p} className="capitalize">
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Due date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input mt-1 w-full" />
        </div>

        <div className="sm:col-span-6">
          <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Assignees</label>
          <select
            multiple
            value={assigneeIds}
            onChange={(e) => setAssigneeIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
            className="input mt-1 w-full"
            size={Math.min(4, Math.max(2, people.length))}
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-navy-300">Hold Ctrl / Cmd to select more than one.</p>
        </div>

        <button
          type="submit"
          disabled={submitting || !stageId || !ownerId}
          className="btn-accent flex items-center justify-center gap-1.5 sm:col-span-6"
        >
          <Plus size={16} />
          {submitting ? "Creating..." : "Create task"}
        </button>

        {!clientId && (
          <p className="text-xs text-navy-400 sm:col-span-6">
            No client selected — this will be an internal task, hidden from client contacts.
          </p>
        )}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-6">{error}</p>}
      </form>
    </div>
  );
}

function EditTaskForm({
  deliverable,
  clients,
  onSaved,
  onClose,
}: {
  deliverable: Deliverable;
  clients: Client[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(deliverable.title);
  const [description, setDescription] = useState(deliverable.description ?? "");
  const [clientId, setClientId] = useState(deliverable.clientId ?? "");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>(
    deliverable.priority as (typeof PRIORITIES)[number],
  );
  const [dueDate, setDueDate] = useState(deliverable.dueDate ? deliverable.dueDate.slice(0, 10) : "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPatch(`/deliverables/${deliverable.id}`, {
        title,
        description: description || undefined,
        clientId: clientId || null,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save changes.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-navy-900/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.06)] sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-navy-900">Edit task</h2>
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
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="input mt-1 w-full"
            />
          </div>

          <div>
            <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="input mt-1 w-full"
            >
              <option value="">No client (internal task)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input mt-1 w-full resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as (typeof PRIORITIES)[number])}
                className="input mt-1 w-full capitalize"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p} className="capitalize">
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs font-semibold uppercase tracking-wide text-navy-500">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input mt-1 w-full"
              />
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