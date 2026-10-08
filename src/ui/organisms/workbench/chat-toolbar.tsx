"use client";

import * as React from "react";
import { Paperclip, ShieldCheck, Sparkles, SlidersHorizontal, Terminal } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CliAgentKind, CliPermissionMode } from "@/client/api/generated/model";
import { useContextFiles } from "@/client/stores/workbench-editor-store";
import { ModeSwitch } from "@/ui/molecules/mode-switch";
import { ToolbarSelect } from "@/ui/molecules/toolbar-select";
import { IconButton } from "@/ui/primitives/button";
import { Icon } from "@/ui/primitives/icon";
import type { SettingsTab } from "@/ui/organisms/settings/SettingsDialog";
import { useAgentBusy } from "./use-agent-busy";
import { useAgentSettings } from "./use-agent-settings";
import { ChatDockMenu } from "./chat-dock-menu";
import { ChatSessionControls } from "./chat-session-controls";

const PERMISSION_MODES: CliPermissionMode[] = ["DEFAULT", "PLAN", "ACCEPT_EDITS", "BYPASS"];
/**
 * Mức quyền chạy được theo loại CLI (khớp `supportedPermissionModes` ở server). Antigravity headless chỉ có Bypass;
 * loại không có trong bảng (Aider, Custom) luôn chạy theo args của profile.
 */
const PERMISSION_SUPPORT: Partial<Record<CliAgentKind, readonly CliPermissionMode[]>> = {
  CLAUDE_CODE: PERMISSION_MODES,
  CODEX: PERMISSION_MODES,
  ANTIGRAVITY: ["DEFAULT", "BYPASS"],
};

type ChatToolbarProps = { workspaceId: string; onOpenSettings: (tab: SettingsTab) => void };

/**
 * Quick Setting Toolbar (ChatToolbar.md, spec 3.4): ModeSwitch API ↔ CLI, chọn nhanh model (API) hoặc CLI profile + mức quyền,
 * New session / History của phiên chat, số spec trong context, đổi vị trí khung chat, icon Settings mở đúng tab. Đổi nhanh ghi qua `updateSettings`.
 */
export function ChatToolbar({ workspaceId, onOpenSettings }: ChatToolbarProps) {
  const t = useTranslations("workbench.toolbar");
  const { loading, mode, model, profileId, permissionMode, profiles, patch } = useAgentSettings();
  const { busy } = useAgentBusy(workspaceId);
  const context = useContextFiles(workspaceId);

  const profileOptions = React.useMemo(() => profiles.map((p) => ({ value: p.id, label: p.id, hint: p.command })), [profiles]);
  const kind = profiles.find((p) => p.id === profileId)?.kind;
  const supported = kind ? PERMISSION_SUPPORT[kind] : undefined;
  const permissionSupported = supported !== undefined;
  const permissionOptions = React.useMemo(
    () =>
      PERMISSION_MODES.map((m) => {
        const usable = !supported || supported.includes(m);
        return { value: m, label: t(`permission.${m}`), hint: usable ? t(`permissionHint.${m}`) : t("permissionUnsupported"), disabled: !usable };
      }),
    [t, supported],
  );

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
        <>
          <ToolbarSelect
            aria-label={t("profile")}
            icon={Terminal}
            options={profileOptions}
            value={profileId}
            disabled={loading || busy}
            placeholder={t("profilePlaceholder")}
            onChange={(id) => id && id !== profileId && patch({ activeProfileId: id })}
          />
          <ToolbarSelect
            aria-label={t("permissionLabel")}
            icon={ShieldCheck}
            mono={false}
            className="w-auto min-w-[150px]"
            options={permissionOptions}
            value={permissionSupported ? permissionMode : "DEFAULT"}
            disabled={loading || busy || !permissionSupported}
            onChange={(m) => m && m !== permissionMode && patch({ permissionMode: m as CliPermissionMode })}
          />
        </>
      )}
      <ChatSessionControls workspaceId={workspaceId} disabled={busy} />
      <span className="flex-1" />
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs leading-4 text-muted-foreground">
        <Icon icon={Paperclip} size="sm" />
        {t("context", { count: context.length })}
      </span>
      <ChatDockMenu />
      <IconButton icon={SlidersHorizontal} size="icon-sm" label={t("settings")} tooltipSide="top" onClick={() => onOpenSettings(mode === "API" ? "API" : "CLI")} />
    </>
  );
}
