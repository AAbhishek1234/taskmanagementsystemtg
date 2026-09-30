"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Folder as FolderIcon, ListChecks, MoreHorizontal, Plus, Sparkles } from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { HIERARCHY_CHANGED, SPACE_COLORS, notifyHierarchyChanged } from "@/lib/hierarchy";
import { useAuth } from "@/context/AuthContext";
import type { SpaceNode } from "@/lib/types";

type Kind = "space" | "folder" | "list";

/** What the inline name box is currently doing. */
type Draft =
  | { mode: "create"; kind: "space" }
  | { mode: "create"; kind: "folder"; spaceId: string }
  | { mode: "create"; kind: "list"; spaceId: string; folderId: string | null }
  | { mode: "rename"; kind: Kind; id: string; current: string };

function readCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem("sidebar-collapsed") ?? "{}");
  } catch {
    return {};
  }
}

export function SidebarTree() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const canManage = user?.role === "admin" || user?.role === "manager";

  const [spaces, setSpaces] = useState<SpaceNode[] | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftName, setDraftName] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<{ spaces: SpaceNode[] }>("/spaces/tree");
      setSpaces(res.spaces);
    } catch {
      setSpaces([]);
    }
  }, []);

  useEffect(() => {
    setCollapsed(readCollapsed());
    load();
    window.addEventListener(HIERARCHY_CHANGED, load);
    return () => window.removeEventListener(HIERARCHY_CHANGED, load);
  }, [load]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuFor(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("sidebar-collapsed", JSON.stringify(next));
      } catch {
        /* storage unavailable — collapse state just isn't remembered */
      }
      return next;
    });
  }

  function startDraft(d: Draft) {
    setMenuFor(null);
    setError(null);
    setDraft(d);
    setDraftName(d.mode === "rename" ? d.current : "");
    // make sure the parent is open so the new row is visible
    if (d.mode === "create" && d.kind !== "space") {
      setCollapsed((prev) => ({ ...prev, [d.spaceId]: false, ...(d.kind === "list" && d.folderId ? { [d.folderId]: false } : {}) }));
    }
  }

  async function submitDraft(e: FormEvent) {
    e.preventDefault();
    if (!draft || !draftName.trim()) return;
    const name = draftName.trim();
    try {
      if (draft.mode === "rename") {
        const path = draft.kind === "space" ? "spaces" : draft.kind === "folder" ? "folders" : "lists";
        await apiPatch(`/${path}/${draft.id}`, { name });
      } else if (draft.kind === "space") {
        await apiPost("/spaces", { name, color: SPACE_COLORS[(spaces?.length ?? 0) % SPACE_COLORS.length] });
      } else if (draft.kind === "folder") {
        await apiPost("/folders", { spaceId: draft.spaceId, name });
      } else {
        await apiPost("/lists", { spaceId: draft.spaceId, folderId: draft.folderId, name });
      }
      setDraft(null);
      setDraftName("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save that.");
    }
  }

  async function remove(kind: Kind, id: string, name: string) {
    setMenuFor(null);
    const what =
      kind === "space"
        ? `Delete Space "${name}" and all its Folders and Lists? Tasks are kept and stay visible under Everything.`
        : kind === "folder"
          ? `Delete Folder "${name}" and its Lists? Tasks are kept and stay visible under Everything.`
          : `Delete List "${name}"? Tasks are kept and stay visible under Everything.`;
    if (!confirm(what)) return;
    try {
      await apiDelete(`/${kind === "space" ? "spaces" : kind === "folder" ? "folders" : "lists"}/${id}`);
      if (pathname?.includes(id)) router.push("/tasks");
      await load();
      notifyHierarchyChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete that.");
    }
  }

  async function createStarter() {
    try {
      await apiPost("/spaces/starter");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the starter structure.");
    }
  }

  function nameBox(indent: string, key?: string) {
    return (
      <form key={key} onSubmit={submitDraft} className={`${indent} pr-1 py-1`}>
        <input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setDraft(null)}
          onBlur={() => !draftName.trim() && setDraft(null)}
          placeholder={draft?.mode === "rename" ? "Rename" : `New ${draft?.kind} name`}
          className="w-full rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs text-white placeholder:text-white/40 focus:border-orange focus:outline-none"
        />
      </form>
    );
  }

  function rowMenu(id: string, kind: Kind, name: string, spaceId: string, folderId?: string | null) {
    if (!canManage) return null;
    const open = menuFor === id;
    return (
      <div className="relative" ref={open ? menuRef : undefined}>
        <button
          onClick={(e) => {
            e.preventDefault();
            setMenuFor(open ? null : id);
          }}
          aria-label={`Options for ${name}`}
          className="rounded p-0.5 text-white/50 hover:bg-white/10 hover:text-white"
        >
          <MoreHorizontal size={14} />
        </button>
        {open && (
          <div className="absolute right-0 top-6 z-30 w-40 rounded-lg border border-navy-100 bg-white py-1 text-xs text-navy-700 shadow-card-hover">
            {kind === "space" && (
              <>
                <MenuItem onClick={() => startDraft({ mode: "create", kind: "folder", spaceId })}>New Folder</MenuItem>
                <MenuItem onClick={() => startDraft({ mode: "create", kind: "list", spaceId, folderId: null })}>New List</MenuItem>
              </>
            )}
            {kind === "folder" && (
              <MenuItem onClick={() => startDraft({ mode: "create", kind: "list", spaceId, folderId: folderId ?? id })}>New List</MenuItem>
            )}
            <MenuItem onClick={() => startDraft({ mode: "rename", kind, id, current: name })}>Rename</MenuItem>
            <MenuItem danger onClick={() => remove(kind, id, name)}>
              Delete
            </MenuItem>
          </div>
        )}
      </div>
    );
  }

  if (spaces === null) return <p className="px-3 text-xs text-white/40">Loading spaces...</p>;

  const renaming = (kind: Kind, id: string) => draft?.mode === "rename" && draft.kind === kind && draft.id === id;

  return (
    <div className="mt-6 min-h-0">
      <div className="flex items-center justify-between px-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Spaces</p>
        {canManage && (
          <button
            onClick={() => startDraft({ mode: "create", kind: "space" })}
            aria-label="New Space"
            className="rounded p-0.5 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {error && <p className="mx-3 mt-2 rounded bg-red-500/20 px-2 py-1 text-[11px] text-red-100">{error}</p>}

      {draft?.mode === "create" && draft.kind === "space" && nameBox("px-3")}

      {spaces.length === 0 && !draft && (
        <div className="mx-3 mt-2 rounded-lg border border-dashed border-white/20 p-3 text-xs text-white/60">
          <p>No Spaces yet.</p>
          {canManage ? (
            <button onClick={createStarter} className="mt-2 flex items-center gap-1.5 font-medium text-orange-300 hover:text-orange-200">
              <Sparkles size={12} /> Create starter structure
            </button>
          ) : (
            <p className="mt-1 text-white/40">An admin or manager will set these up.</p>
          )}
        </div>
      )}

      <ul className="mt-1 space-y-0.5">
        {spaces.map((space) => {
          const spaceOpen = !collapsed[space.id];
          const spaceActive = pathname === `/spaces/${space.id}`;
          return (
            <li key={space.id}>
              {renaming("space", space.id) ? (
                nameBox("pl-6")
              ) : (
                <div className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 ${spaceActive ? "bg-white/15" : "hover:bg-white/10"}`}>
                  <button onClick={() => toggle(space.id)} aria-label={spaceOpen ? "Collapse" : "Expand"} className="text-white/50 hover:text-white">
                    {spaceOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  <Link href={`/spaces/${space.id}`} className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-white/85">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
                      style={{ backgroundColor: space.color ?? "#4c68a0" }}
                    >
                      {space.name[0]?.toUpperCase()}
                    </span>
                    <span className="truncate">{space.name}</span>
                  </Link>
                  {rowMenu(space.id, "space", space.name, space.id)}
                </div>
              )}

              {spaceOpen && (
                <div className="ml-3 border-l border-white/10 pl-1">
                  {space.folders.map((folder) => {
                    const folderOpen = !collapsed[folder.id];
                    return (
                      <div key={folder.id}>
                        {renaming("folder", folder.id) ? (
                          nameBox("pl-6")
                        ) : (
                          <div className="group flex items-center gap-1 rounded-lg px-2 py-1 text-white/70 hover:bg-white/10">
                            <button onClick={() => toggle(folder.id)} aria-label={folderOpen ? "Collapse" : "Expand"} className="text-white/40 hover:text-white">
                              {folderOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                            <FolderIcon size={14} className="shrink-0 text-white/50" />
                            <span className="min-w-0 flex-1 truncate text-[13px]">{folder.name}</span>
                            {rowMenu(folder.id, "folder", folder.name, space.id, folder.id)}
                          </div>
                        )}
                        {folderOpen && (
                          <div className="ml-3 border-l border-white/10 pl-1">
                            {folder.lists.map((list) => (
                              renaming("list", list.id) ? nameBox("pl-6", list.id) : <ListRow key={list.id} list={list} pathname={pathname} menu={rowMenu(list.id, "list", list.name, space.id)} />
                            ))}
                            {draft?.mode === "create" && draft.kind === "list" && draft.folderId === folder.id && nameBox("pl-6")}
                            {folder.lists.length === 0 && !(draft?.mode === "create" && draft.kind === "list" && draft.folderId === folder.id) && (
                              <p className="px-3 py-1 text-[11px] text-white/30">No lists</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {draft?.mode === "create" && draft.kind === "folder" && draft.spaceId === space.id && nameBox("pl-6")}

                  {space.lists.map((list) => (
                    renaming("list", list.id) ? nameBox("pl-6", list.id) : <ListRow key={list.id} list={list} pathname={pathname} menu={rowMenu(list.id, "list", list.name, space.id)} />
                  ))}
                  {draft?.mode === "create" && draft.kind === "list" && draft.spaceId === space.id && draft.folderId === null && nameBox("pl-6")}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ListRow({ list, pathname, menu }: { list: SpaceNode["lists"][number]; pathname: string | null; menu: React.ReactNode }) {
  const active = pathname === `/lists/${list.id}`;
  return (
    <div className={`group flex items-center gap-1 rounded-lg px-2 py-1 ${active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
      <Link href={`/lists/${list.id}`} className="flex min-w-0 flex-1 items-center gap-2 text-[13px]">
        <ListChecks size={14} className="shrink-0 text-white/40" />
        <span className="truncate">{list.name}</span>
        {list.taskCount > 0 && <span className="ml-auto text-[11px] text-white/40">{list.taskCount}</span>}
      </Link>
      {menu}
    </div>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`block w-full px-3 py-1.5 text-left hover:bg-navy-50 ${danger ? "text-red-600" : ""}`}>
      {children}
    </button>
  );
}
