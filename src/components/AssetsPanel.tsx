// "use client";

// import { useEffect, useRef, useState } from "react";
// import { apiGet, apiPost, apiUpload, assetFileUrl, ApiError } from "@/lib/api";
// import { useAuth } from "@/context/AuthContext";
// import type { Asset } from "@/lib/types";

// const STATUS_STYLE: Record<Asset["status"], string> = {
//   draft: "bg-navy-50 text-navy-500",
//   in_review: "bg-orange-50 text-orange-700",
//   approved: "bg-emerald-50 text-emerald-700",
//   delivered: "bg-navy-50 text-navy-600",
// };

// const STATUS_LABEL: Record<Asset["status"], string> = {
//   draft: "Draft",
//   in_review: "In review",
//   approved: "Approved",
//   delivered: "Delivered",
// };

// function isImage(mime: string) {
//   return mime.startsWith("image/");
// }

// function formatBytes(bytes: number) {
//   if (bytes < 1024) return `${bytes} B`;
//   if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
//   return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
// }

// export function AssetsPanel({ deliverableId }: { deliverableId: string }) {
//   const { user } = useAuth();
//   const [assets, setAssets] = useState<Asset[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [uploading, setUploading] = useState(false);
//   const newAssetInputRef = useRef<HTMLInputElement>(null);
//   const [newAssetName, setNewAssetName] = useState("");

//   const canUpload =
//     user?.role === "admin" ||
//     user?.role === "manager" ||
//     user?.role === "team_member" ||
//     user?.role === "freelancer";

//   const canDecide =
//     user?.role === "admin" || user?.role === "manager";

//   async function load() {
//     setLoading(true);

//     try {
//       const res = await apiGet<{ assets: Asset[] }>(
//         `/deliverables/${deliverableId}/assets`
//       );

//       setAssets(res.assets);
//     } catch (err) {
//       setError(
//         err instanceof ApiError ? err.message : "Could not load assets."
//       );
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     load();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [deliverableId]);

//   async function handleNewAssetUpload(file: File) {
//     setError(null);
//     setUploading(true);

//     try {
//       const form = new FormData();
//       form.append("file", file);

//       if (newAssetName.trim()) {
//         form.append("name", newAssetName.trim());
//       }

//       await apiUpload(`/deliverables/${deliverableId}/assets`, form);

//       setNewAssetName("");

//       if (newAssetInputRef.current) {
//         newAssetInputRef.current.value = "";
//       }

//       load();
//     } catch (err) {
//       setError(err instanceof ApiError ? err.message : "Upload failed.");
//     } finally {
//       setUploading(false);
//     }
//   }

//   return (
//     <section className="card p-4 sm:p-5">
//       <div className="flex items-center justify-between">
//         <h2 className="text-sm font-semibold text-navy-900">
//           Assets &amp; review
//         </h2>

//         {error && (
//           <span className="text-xs text-red-600">
//             {error}
//           </span>
//         )}
//       </div>

//       {loading ? (
//         <p className="mt-3 text-sm text-navy-300">
//           Loading...
//         </p>
//       ) : (
//         <div className="mt-4 space-y-5">
//           {assets.map((asset) => (
//             <AssetCard
//               key={asset.id}
//               asset={asset}
//               canDecide={canDecide}
//               canUpload={canUpload}
//               onChanged={load}
//             />
//           ))}

//           {assets.length === 0 && (
//             <p className="text-sm text-navy-300">
//               No files uploaded yet.
//             </p>
//           )}
//         </div>
//       )}

//       {canUpload && (
//         <div className="mt-5 rounded-lg border border-dashed border-navy-200 bg-navy-50/40 p-4">
//           <p className="label mb-2">
//             Upload a new asset
//           </p>

//           <div className="flex flex-wrap items-center gap-2">
//             <input
//               value={newAssetName}
//               onChange={(e) => setNewAssetName(e.target.value)}
//               placeholder="Name (optional, e.g. Diwali Poster)"
//               className="input max-w-xs"
//             />

//             <input
//               ref={newAssetInputRef}
//               type="file"
//               accept="image/*,video/*,application/pdf"
//               disabled={uploading}
//               onChange={(e) => {
//                 const file = e.target.files?.[0];

//                 if (file) {
//                   handleNewAssetUpload(file);
//                 }
//               }}
//               className="text-sm text-navy-500 file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-navy-700"
//             />
//           </div>

//           {uploading && (
//             <p className="mt-2 text-xs text-navy-400">
//               Uploading...
//             </p>
//           )}
//         </div>
//       )}
//     </section>
//   );
// }

// function AssetCard({
//   asset,
//   canDecide,
//   canUpload,
//   onChanged,
// }: {
//   asset: Asset;
//   canDecide: boolean;
//   canUpload: boolean;
//   onChanged: () => void;
// }) {
//   const [feedbackBody, setFeedbackBody] = useState("");
//   const [submitting, setSubmitting] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const reuploadRef = useRef<HTMLInputElement>(null);

//   const latestVersion =
//     asset.versions[asset.versions.length - 1];

//   async function postFeedback(
//     kind: "comment" | "approved" | "changes_requested"
//   ) {
//     setError(null);

//     if (kind === "comment" && !feedbackBody.trim()) {
//       return;
//     }

//     setSubmitting(true);

//     try {
//       await apiPost(`/assets/${asset.id}/feedback`, {
//         kind,
//         body: feedbackBody.trim() || undefined,
//       });

//       setFeedbackBody("");
//       onChanged();
//     } catch (err) {
//       setError(
//         err instanceof ApiError
//           ? err.message
//           : "Could not post that."
//       );
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   async function handleReupload(file: File) {
//     setError(null);
//     setSubmitting(true);

//     try {
//       const form = new FormData();
//       form.append("file", file);

//       await apiUpload(
//         `/assets/${asset.id}/versions`,
//         form
//       );

//       if (reuploadRef.current) {
//         reuploadRef.current.value = "";
//       }

//       onChanged();
//     } catch (err) {
//       setError(
//         err instanceof ApiError
//           ? err.message
//           : "Re-upload failed."
//       );
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   return (
//     <div className="rounded-xl border border-navy-100 bg-white">
//       <div className="flex items-center justify-between border-b border-navy-50 px-4 py-2.5">
//         <div className="flex items-center gap-2">
//           <span className="text-sm font-semibold text-navy-900">
//             {asset.name}
//           </span>

//           <span
//             className={`badge ${STATUS_STYLE[asset.status]}`}
//           >
//             {STATUS_LABEL[asset.status]}
//           </span>
//         </div>

//         <span className="text-xs text-navy-300">
//           v{latestVersion?.versionNumber ?? "-"}
//         </span>
//       </div>

//       <div className="grid gap-4 p-4 sm:grid-cols-[160px_1fr]">
//         <div>
//           {latestVersion &&
//           isImage(latestVersion.mimeType) ? (
//             // eslint-disable-next-line @next/next/no-img-element
//             <img
//               src={assetFileUrl(
//                 asset.id,
//                 latestVersion.id
//               )}
//               alt={asset.name}
//               className="h-40 w-full rounded-lg border border-navy-100 object-cover"
//             />
//           ) : (
//             <a
//               href={
//                 latestVersion
//                   ? assetFileUrl(
//                       asset.id,
//                       latestVersion.id
//                     )
//                   : "#"
//               }
//               target="_blank"
//               rel="noreferrer"
//               className="flex h-40 w-full flex-col items-center justify-center gap-1 rounded-lg border border-navy-100 bg-navy-50 text-navy-400 hover:bg-navy-100"
//             >
//               <span className="text-2xl">📄</span>
//               <span className="text-xs">
//                 Open file
//               </span>
//             </a>
//           )}

//           {latestVersion && (
//             <p
//               className="mt-1.5 truncate text-[11px] text-navy-300"
//               title={latestVersion.originalFilename}
//             >
//               {latestVersion.originalFilename} &middot;{" "}
//               {formatBytes(latestVersion.sizeBytes)}
//             </p>
//           )}
//         </div>

//         <div className="space-y-3">
//           {asset.versions.length > 1 && (
//             <details className="text-xs text-navy-400">
//               <summary className="cursor-pointer font-medium text-navy-500">
//                 Version history ({asset.versions.length})
//               </summary>

//               <ul className="mt-1.5 space-y-1">
//                 {[...asset.versions]
//                   .reverse()
//                   .map((v) => (
//                     <li
//                       key={v.id}
//                       className="flex items-center justify-between"
//                     >
//                       <a
//                         href={assetFileUrl(
//                           asset.id,
//                           v.id
//                         )}
//                         target="_blank"
//                         rel="noreferrer"
//                         className="text-orange hover:underline"
//                       >
//                         v{v.versionNumber} &middot;{" "}
//                         {v.originalFilename}
//                       </a>

//                       <span>
//                         {v.uploadedBy.name} &middot;{" "}
//                         {new Date(
//                           v.createdAt
//                         ).toLocaleDateString()}
//                       </span>
//                     </li>
//                   ))}
//               </ul>
//             </details>
//           )}

//           <div className="space-y-2">
//             {asset.feedback.length === 0 ? (
//               <p className="text-xs text-navy-300">
//                 No feedback yet.
//               </p>
//             ) : (
//               asset.feedback.map((f) => (
//                 <div
//                   key={f.id}
//                   className="rounded-lg bg-navy-50/60 px-3 py-2 text-xs"
//                 >
//                   <div className="flex items-center gap-1.5">
//                     <span className="font-semibold text-navy-800">
//                       {f.author.name}
//                     </span>

//                     {f.kind === "approved" && (
//                       <span className="badge bg-emerald-50 text-emerald-700">
//                         Approved v{f.versionNumber}
//                       </span>
//                     )}

//                     {f.kind === "changes_requested" && (
//                       <span className="badge bg-orange-50 text-orange-700">
//                         Requested changes on v
//                         {f.versionNumber}
//                       </span>
//                     )}

//                     <span className="text-navy-300">
//                       {new Date(
//                         f.createdAt
//                       ).toLocaleString()}
//                     </span>
//                   </div>

//                   {f.body && (
//                     <p className="mt-1 text-navy-600">
//                       {f.body}
//                     </p>
//                   )}
//                 </div>
//               ))
//             )}
//           </div>

//           <div className="space-y-2 border-t border-navy-50 pt-3">
//             <textarea
//               value={feedbackBody}
//               onChange={(e) =>
//                 setFeedbackBody(e.target.value)
//               }
//               placeholder="Leave feedback..."
//               rows={2}
//               className="input"
//             />

//             <div className="flex flex-wrap items-center gap-2">
//               <button
//                 onClick={() => postFeedback("comment")}
//                 disabled={
//                   submitting || !feedbackBody.trim()
//                 }
//                 className="btn-secondary text-xs"
//               >
//                 Comment
//               </button>

//               {canDecide && (
//                 <>
//                   <button
//                     onClick={() =>
//                       postFeedback("changes_requested")
//                     }
//                     disabled={submitting}
//                     className="btn-accent text-xs"
//                   >
//                     Request changes
//                   </button>

//                   <button
//                     onClick={() =>
//                       postFeedback("approved")
//                     }
//                     disabled={submitting}
//                     className="btn-primary text-xs"
//                   >
//                     Approve
//                   </button>
//                 </>
//               )}

//               {canUpload && (
//                 <label className="ml-auto cursor-pointer text-xs font-medium text-orange hover:underline">
//                   Re-upload new version

//                   <input
//                     ref={reuploadRef}
//                     type="file"
//                     accept="image/*,video/*,application/pdf"
//                     className="hidden"
//                     onChange={(e) => {
//                       const file = e.target.files?.[0];

//                       if (file) {
//                         handleReupload(file);
//                       }
//                     }}
//                   />
//                 </label>
//               )}
//             </div>

//             {error && (
//               <p className="text-xs text-red-600">
//                 {error}
//               </p>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }"use client";



"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiDelete } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

type CloudFile = {
  publicId: string;
  url: string;
  type: "image" | "video" | "raw";
  format?: string;
  bytes?: number;
  createdAt?: string;
  name: string | null;
  note: string | null;
  uploader: string | null;
};

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "file";
}

// Cloudinary context values can't contain | or =
function esc(s: string) {
  return s.replace(/[|=]/g, " ").trim();
}

function formatBytes(b?: number) {
  if (!b) return "";
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssetsPanel({
  deliverableId,
  assigneeIds,
}: {
  deliverableId: string;
  assigneeIds: string[];
  clientId?: string | null;
}) {
  const { user } = useAuth();
  const tag = `deliverable_${deliverableId}`;

  const [files, setFiles] = useState<CloudFile[]>([]);
  const [pending, setPending] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";
  const isAssigned =
    (user?.role === "team_member" || user?.role === "freelancer") &&
    !!user?.id &&
    assigneeIds.includes(user.id);
  // The deliverable page already blocks clients from tasks that aren't theirs
  const isOwnClient = user?.role === "client";
  const canUpload = isAdminOrManager || isAssigned;
  const canDelete = isAdminOrManager;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const canView = isAdminOrManager || isAssigned || isOwnClient;

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ files: CloudFile[] }>(
        `/cloud-assets/${deliverableId}`
      );
      setFiles(data.files);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load files");
    } finally {
      setLoading(false);
    }
  }, [deliverableId]);

  useEffect(() => {
    if (canView) load();
    else setLoading(false);
  }, [canView, load]);

  async function uploadToCloudinary(file: File | string, label: string, ext?: string) {
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", PRESET);
    form.append("tags", tag);
    form.append("public_id", `${slug(label)}_${Date.now()}${ext ? "." + ext : ""}`);
    form.append(
      "context",
      [
        `name=${esc(label)}`,
        note.trim() ? `note=${esc(note)}` : "",
        `uploader=${esc(user?.name ?? "Unknown")}`,
      ]
        .filter(Boolean)
        .join("|")
    );

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? "Upload failed");
  }

  async function handleUpload() {
    if (pending.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of pending) {
        if (file.size > 100 * 1024 * 1024) {
          throw new Error(`${file.name} is larger than 100 MB`);
        }
        const dot = file.name.lastIndexOf(".");
        const base = dot > 0 ? file.name.slice(0, dot) : file.name;
        const ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : undefined;
        const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");
        await uploadToCloudinary(file, name.trim() || base, isMedia ? undefined : ext);
      }
      setPending([]);
      setName("");
      setNote("");
      if (inputRef.current) inputRef.current.value = "";
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(f: CloudFile) {
    if (!window.confirm(`Delete "${f.name ?? f.publicId}"? This cannot be undone.`)) return;
    setError(null);
    setDeletingId(f.publicId);
    try {
      await apiDelete(
        `/cloud-assets/${deliverableId}?type=${f.type}&publicId=${encodeURIComponent(f.publicId)}`
      );
      setFiles((prev) => prev.filter((x) => x.publicId !== f.publicId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete file");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLink() {
    const url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      setError("Enter a valid http(s) URL");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const last = url.split("?")[0].split("/").pop() ?? "link";
      const dot = last.lastIndexOf(".");
      const ext = dot > 0 ? last.slice(dot + 1).toLowerCase() : undefined;
      const isMedia = ["jpg", "jpeg", "png", "gif", "webp", "mp4", "mov", "webm"].includes(ext ?? "");
      await uploadToCloudinary(
        url,
        name.trim() || (dot > 0 ? last.slice(0, dot) : last),
        isMedia ? undefined : ext
      );
      setLinkUrl("");
      setName("");
      setNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not fetch that URL");
    } finally {
      setUploading(false);
    }
  }

  if (!canView) {
    return (
      <section className="card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-navy-900">Assets &amp; review</h2>
        <p className="mt-3 text-sm text-navy-300">
          You don&apos;t have access to files on this task.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-navy-900">
          Assets &amp; review {files.length > 0 && `(${files.length})`}
        </h2>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-navy-300">Loading...</p>
      ) : files.length === 0 ? (
        <p className="mt-3 text-sm text-navy-300">No files uploaded yet.</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((f) => (
            <div key={f.publicId} className="rounded-xl border border-navy-100 bg-white p-3">
              {f.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt={f.name ?? ""} className="h-40 w-full rounded-lg object-cover" />
              ) : f.type === "video" ? (
                <video src={f.url} controls className="h-40 w-full rounded-lg bg-black" />
              ) : (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-40 w-full flex-col items-center justify-center gap-1 rounded-lg border border-navy-100 bg-navy-50 text-navy-400 hover:bg-navy-100"
                >
                  <span className="text-2xl">{f.format === "csv" ? "📊" : "📄"}</span>
                  <span className="text-xs">Open file</span>
                </a>
              )}

              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block truncate text-sm font-semibold text-navy-900 hover:underline"
                title={f.name ?? f.publicId}
              >
                {f.name ?? f.publicId}
              </a>

              {f.note && <p className="mt-1 text-xs text-navy-600">{f.note}</p>}

              <p className="mt-1.5 text-[11px] text-navy-300">
                {f.uploader ? `By ${f.uploader} · ` : ""}
                {f.createdAt ? new Date(f.createdAt).toLocaleString() : ""}
                {f.bytes ? ` · ${formatBytes(f.bytes)}` : ""}
              </p>

              {canDelete && (
                <button
                  onClick={() => handleDelete(f)}
                  disabled={deletingId === f.publicId}
                  className="mt-2 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                >
                  {deletingId === f.publicId ? "Deleting..." : "Delete"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canUpload && (
        <div className="mt-5 space-y-3 rounded-lg border border-dashed border-navy-200 bg-navy-50/40 p-4">
          <p className="label">Upload a new asset</p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional, e.g. Diwali Poster)"
              className="input max-w-xs"
            />
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,video/*,application/pdf,.csv,text/csv"
              disabled={uploading}
              onChange={(e) => setPending(Array.from(e.target.files ?? []))}
              className="text-sm text-navy-500 file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-navy-700"
            />
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional, shown with the file)"
            rows={2}
            className="input"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading || pending.length === 0}
              className="btn-primary text-xs"
            >
              {uploading
                ? "Uploading..."
                : pending.length > 1
                ? `Upload ${pending.length} files`
                : "Upload"}
            </button>
            {pending.length > 0 && !uploading && (
              <button
                onClick={() => {
                  setPending([]);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="btn-secondary text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-navy-100 pt-3">
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="...or paste a file URL (https://...)"
              className="input max-w-md"
            />
            <button
              onClick={handleLink}
              disabled={uploading || !linkUrl.trim()}
              className="btn-secondary text-xs"
            >
              Add URL
            </button>
          </div>
        </div>
      )}
    </section>
  );
}