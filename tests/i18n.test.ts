import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";
import { ERROR_CODES } from "@/ship/contracts/errors";

function get(obj: unknown, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

function keys(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("i18n", () => {
  for (const locale of LOCALES) {
    it(`mọi ErrorCode có bản dịch (${locale})`, () => {
      const messages = loadMessages(locale);
      const missing = ERROR_CODES.filter((code) => typeof get(messages, `errors.${code}`) !== "string");
      expect(missing, `thiếu bản dịch trong messages/${locale}/errors-*.json`).toEqual([]);
    });
  }

  it("các locale có cùng bộ khoá", () => {
    const [base, ...rest] = LOCALES.map((l) => new Set(keys(loadMessages(l))));
    for (const [i, other] of rest.entries()) {
      expect([...base].filter((k) => !other.has(k)), `thiếu ở ${LOCALES[i + 1]}`).toEqual([]);
      expect([...other].filter((k) => !base.has(k)), `thừa ở ${LOCALES[i + 1]}`).toEqual([]);
    }
  });
});
