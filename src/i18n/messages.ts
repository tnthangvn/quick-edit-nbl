import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Locale } from "./locales";

type Messages = Record<string, unknown>;

function deepMerge(target: Messages, source: Messages, file: string, trail = ""): Messages {
  for (const [key, value] of Object.entries(source)) {
    const at = trail ? `${trail}.${key}` : key;
    const existing = target[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (existing !== undefined && (typeof existing !== "object" || existing === null)) throw new Error(`${file}: xung đột khoá ${at}`);
      target[key] = deepMerge((existing as Messages) ?? {}, value as Messages, file, at);
    } else {
      if (existing !== undefined) throw new Error(`${file}: trùng khoá ${at}`);
      target[key] = value;
    }
  }
  return target;
}

/**
 * Gộp mọi file messages/<locale>/*.json thành một object. Mỗi file sở hữu một nhóm khoá
 * (vd errors-core.json → errors.INTERNAL.*, errors-spec.json → errors.SPEC.*, workbench.json → workbench.*).
 * Trùng khoá giữa hai file → lỗi ngay.
 */
export function loadMessages(locale: Locale, root = path.join(process.cwd(), "messages")): Messages {
  const dir = path.join(root, locale);
  const merged: Messages = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    deepMerge(merged, JSON.parse(readFileSync(path.join(dir, file), "utf8")) as Messages, `${locale}/${file}`);
  }
  return merged;
}
