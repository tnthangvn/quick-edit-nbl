import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { LOCALE_COOKIE } from "@/i18n/locales";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "vietnamese"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spec Studio",
  description: "Sửa spec Markdown cùng AI Agent và đồng bộ lên NotebookLM",
};

// Đặt lang theo cookie trước khi paint, giữ shell tĩnh (cacheComponents).
const setLang = `(()=>{try{var m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=(vi|en)/);if(m)document.documentElement.lang=m[1]}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: setLang }} />
      </head>
      <body className="h-full">
        <Suspense fallback={null}>
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  );
}
