import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "./locales";
import { loadMessages } from "./messages";

export default getRequestConfig(async () => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE;
  return { locale, messages: loadMessages(locale), timeZone: "Asia/Ho_Chi_Minh" };
});
