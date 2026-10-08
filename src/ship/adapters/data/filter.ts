import "server-only";
import type { Filter, FilterOperators, FindOptions } from "@/ship/contracts/data";

const OPERATOR_KEYS = new Set(["ne", "gt", "gte", "lt", "lte", "like"]);

export function isOperatorObject(v: unknown): v is FilterOperators<unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.keys(v).length > 0 &&
    Object.keys(v).every((k) => OPERATOR_KEYS.has(k))
  );
}

/** Tên bảng / cột chỉ cho phép ký tự an toàn (dùng khi ghép identifier). */
export function assertIdentifier(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`Identifier không hợp lệ: ${name}`);
  return name;
}

function likeToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  return (a as number | string) < (b as number | string) ? -1 : 1;
}

/** So khớp một row với Filter (dùng cho driver JSON). */
export function matches<R>(row: R, filter: Filter<R>): boolean {
  for (const [key, cond] of Object.entries(filter) as [keyof R & string, unknown][]) {
    if (cond === undefined) continue;
    const value = row[key] as unknown;
    if (cond === null) {
      if (value !== null && value !== undefined) return false;
    } else if (Array.isArray(cond)) {
      if (!cond.includes(value)) return false;
    } else if (isOperatorObject(cond)) {
      const op = cond as FilterOperators<unknown>;
      if ("ne" in op && (op.ne === null ? value === null || value === undefined : value === op.ne)) return false;
      if (op.gt !== undefined && !(compare(value, op.gt) > 0)) return false;
      if (op.gte !== undefined && !(compare(value, op.gte) >= 0)) return false;
      if (op.lt !== undefined && !(compare(value, op.lt) < 0)) return false;
      if (op.lte !== undefined && !(compare(value, op.lte) <= 0)) return false;
      if (op.like !== undefined && !(typeof value === "string" && likeToRegExp(op.like).test(value))) return false;
    } else if (value !== cond) {
      return false;
    }
  }
  return true;
}

/** Sắp xếp + phân trang trong bộ nhớ (driver JSON). */
export function applyOptions<R>(rows: R[], opts: FindOptions<R> = {}): R[] {
  let out = rows;
  if (opts.orderBy?.length) {
    out = [...out].sort((a, b) => {
      for (const [col, dir] of opts.orderBy!) {
        const c = compare(a[col as keyof R], b[col as keyof R]);
        if (c !== 0) return dir === "asc" ? c : -c;
      }
      return 0;
    });
  }
  const start = opts.offset ?? 0;
  return opts.limit === undefined ? out.slice(start) : out.slice(start, start + opts.limit);
}
