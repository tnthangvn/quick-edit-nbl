import "server-only";
import { GitProviderHttpError } from "./types";

const TIMEOUT_MS = 15_000;

export type JsonResponse<T> = { data: T; headers: Headers };

/** Gọi REST JSON có timeout; status ≥ 400 → GitProviderHttpError (không log token / body). */
export async function requestJson<T>(url: string, init: { method?: string; headers: Record<string, string>; body?: unknown }): Promise<JsonResponse<T>> {
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    body: init.body ? JSON.stringify(init.body) : undefined,
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new GitProviderHttpError(res.status);
  return { data: (await res.json()) as T, headers: res.headers };
}

export const matchesQuery = (name: string, q?: string) => !q || name.toLowerCase().includes(q.trim().toLowerCase());
