//const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://task-mgt-backend-tg.onrender.com";
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Thin fetch wrapper: always sends the session cookie (`credentials:
 * "include"`), always sends/reads JSON, and turns a non-2xx response into a
 * thrown ApiError so callers can show `err.message` directly — the API
 * always replies with `{ error: "..." }` on failure.
 */
export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(body.error ?? `Request failed with status ${res.status}`, res.status);
  }

  return body as T;
}

export const apiGet = <T = unknown>(path: string) => api<T>(path, { method: "GET" });
export const apiPost = <T = unknown>(path: string, data?: unknown) =>
  api<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined });
export const apiPatch = <T = unknown>(path: string, data?: unknown) =>
  api<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined });
export const apiDelete = <T = unknown>(path: string) => api<T>(path, { method: "DELETE" });

/** Multipart upload — no Content-Type header, so the browser sets the multipart boundary itself. */
export async function apiUpload<T = unknown>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { method: "POST", credentials: "include", body: formData });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body.error ?? `Upload failed with status ${res.status}`, res.status);
  }
  return body as T;
}

/** Returns a URL for a file that carries the session cookie automatically (same-site request from an <img>/<a>). */
export function assetFileUrl(assetId: string, versionId: string): string {
  return `${API_URL}/assets/${assetId}/versions/${versionId}/file`;
}
