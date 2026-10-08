"use client";

import * as React from "react";
import { Paperclip, Sparkles, SlidersHorizontal, Terminal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useContextFiles } from "@/client/stores/workbench-editor-store";
import { ModeSwitch } from "@/ui/molecules/mode-switch";
import { ToolbarSelect } from "@/ui/molecules/toolbar-select";
import { IconButton } from "@/ui/primitives/button";
import { Icon } from "@/ui/primitives/icon";
import type { SettingsTab } from "@/ui/organisms/settings/SettingsDialog";
import { useAgentBusy } from "./use-agent-busy";
import { useAgentSettings } from "./use-agent-settings";

type ChatToolbarProps = { workspaceId: string; onOpenSettings: (tab: SettingsTab) => void };

/**
 * Quick Setting Toolbar (ChatToolbar.md, spec 3.4): ModeSwitch API ↔ CLI, chọn nhanh model (API) hoặc CLI profile,
 * số spec trong context, icon Settings mở đúng tab. Đổi nhanh ghi qua `updateSettings`.
 */
export function ChatToolbar({ workspaceId, onOpenSettings }: ChatToolbarProps) {
  const t = useTranslations("workbench.toolbar");
  const { loading, mode, model, profileId, profiles, patch } = useAgentSettings();
  const { busy } = useAgentBusy(workspaceId);
  const context = useContextFiles(workspaceId);

  const profileOptions = React.useMemo(() => profiles.map((p) => ({ value: p.id, label: p.id, hint: p.command })), [profiles]);

  return (
    <>
      <ModeSwitch size="sm" value={mode} disabled={loading || busy} onValueChange={(m) => patch({ activeMode: m })} />
      {mode === "API" ? (
        <ToolbarSelect
          aria-label={t("model")}
          icon={Sparkles}
          options={model ? [model] : []}
          value={model}
          allowCustom
          disabled={loading || busy}
          placeholder={t("modelPlaceholder")}
          onChange={(m) => m && m !== model && patch({ model: m })}
        />
      ) : (
        <ToolbarSelect
          aria-label={t("profile")}
          icon={Terminal}
          options={profileOptions}
          value={profileId}
          disabled={loading || busy}
          placeholder={t("profilePlaceholder")}
          onChange={(id) => id && id !== profileId && patch({ activeProfileId: id })}
        />
      )}
      <span className="flex-1" />
      <span className="inline-flex items-center gap-1 text-xs leading-4 text-muted-foreground">
        <Icon icon={Paperclip} size="sm" />
        {t("context", { count: context.length })}
      </span>
      <IconButton icon={SlidersHorizontal} size="icon-sm" label={t("settings")} tooltipSide="top" onClick={() => onOpenSettings(mode === "API" ? "API" : "CLI")} />
    </>
  );
}
