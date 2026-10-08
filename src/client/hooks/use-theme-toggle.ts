"use client";

import { useCallback } from "react";
import { useTheme } from "next-themes";
import { useMounted } from "@/client/hooks/use-mounted";

export type ThemeChoice = "light" | "dark" | "system";

/** Đọc/đổi theme (next-themes, class `.dark`). `resolved` là `undefined` trước khi hydrate. */
export function useThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const resolved = mounted ? (resolvedTheme as "light" | "dark" | undefined) : undefined;

  const toggle = useCallback(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"), [resolvedTheme, setTheme]);

  return {
    theme: (mounted ? theme : undefined) as ThemeChoice | undefined,
    resolved,
    setTheme: setTheme as (theme: ThemeChoice) => void,
    toggle,
  };
}
