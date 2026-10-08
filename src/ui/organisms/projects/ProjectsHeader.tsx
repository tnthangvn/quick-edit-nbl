"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useThemeToggle } from "@/client/hooks/use-theme-toggle";
import { AppHeader } from "@/ui/organisms/app-header";
import { IconButton } from "@/ui/primitives/button";

/** Header màn Projects: tên app, nút đổi giao diện sáng/tối, nút Settings (Tab chung: API, CLI, Integrations). */
export function ProjectsHeader({ onOpenSettings }: { onOpenSettings: () => void }) {
  const t = useTranslations("common.theme");
  const { resolved, toggle } = useThemeToggle();
  return (
    <AppHeader onOpenSettings={onOpenSettings}>
      <IconButton icon={resolved === "dark" ? Sun : Moon} label={t("toggle")} onClick={toggle} />
    </AppHeader>
  );
}
