/** Ngôn ngữ giao diện. `vi` mặc định. Locale lưu ở cookie, không đặt trên URL. */
export const LOCALES = ["vi", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "vi";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);
