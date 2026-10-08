"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/ui/primitives/sonner";
import { TooltipProvider } from "@/ui/primitives/tooltip";

type Props = {
  locale: string;
  messages: AbstractIntlMessages;
  timeZone: string;
  children: ReactNode;
};

/** Provider phía client: i18n, theme (class .dark), TanStack Query, tooltip, toast. */
export function ClientProviders({ locale, messages, timeZone, children }: Props) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: (count, err) => (err as { status?: number }).status === undefined && count < 2 },
        },
      }),
  );

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={400}>
            {children}
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
