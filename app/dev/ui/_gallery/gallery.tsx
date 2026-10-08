"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useThemeToggle, type ThemeChoice } from "@/client/hooks/use-theme-toggle";
import { useHydrateUiStore } from "@/client/stores/ui-store";
import { Icon } from "@/ui/primitives/icon";
import { Segmented, SegmentedItem } from "@/ui/primitives/segmented";
import { Toaster } from "@/ui/primitives/sonner";
import { AppHeader } from "@/ui/organisms/app-header";
import { MoleculesDemo } from "./molecules-demo";
import { GALLERY_TOASTER, PrimitivesDemo } from "./primitives-demo";

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor } as const;

export function Gallery() {
  const t = useTranslations("uiGallery");
  const tt = useTranslations("common.theme");
  const { theme, setTheme } = useThemeToggle();
  useHydrateUiStore();

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="sticky top-0 z-40">
        <AppHeader path="/dev/ui">
          <Segmented value={theme ?? "system"} onValueChange={(v) => setTheme(v as ThemeChoice)} aria-label={tt("toggle")}>
            {(["light", "dark", "system"] as const).map((v) => (
              <SegmentedItem key={v} value={v}>
                <Icon icon={THEME_ICON[v]} />
                {tt(v)}
              </SegmentedItem>
            ))}
          </Segmented>
        </AppHeader>
      </div>
      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-8">
        <div>
          <h1 className="m-0 text-lg leading-6 font-semibold tracking-[-.01em]">{t("title")}</h1>
          <p className="m-0 mt-0.5 text-[13px] leading-[18px] text-muted-foreground">{t("description")}</p>
        </div>
        <PrimitivesDemo />
        <MoleculesDemo />
      </main>
      <Toaster id={GALLERY_TOASTER} />
    </div>
  );
}
