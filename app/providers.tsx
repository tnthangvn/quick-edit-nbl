import { getLocale, getMessages, getTimeZone } from "next-intl/server";
import type { ReactNode } from "react";
import { ClientProviders } from "@/client/providers/ClientProviders";

/** Đọc locale (cookie) và messages ở server rồi truyền xuống provider client. Nằm trong <Suspense> của layout. */
export async function Providers({ children }: { children: ReactNode }) {
  const [locale, messages, timeZone] = await Promise.all([getLocale(), getMessages(), getTimeZone()]);
  return (
    <ClientProviders locale={locale} messages={messages} timeZone={timeZone}>
      {children}
    </ClientProviders>
  );
}
