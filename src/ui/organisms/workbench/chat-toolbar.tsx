"use client";

import * as React from "react";
import { ClipboardList, FilePen, Paperclip, Shield, ShieldAlert, Sparkles, SlidersHorizontal, Terminal, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CliAgentKind, CliEffort, CliPermissionMode } from "@/client/api/generated/model";
import { useContextFiles } from "@/client/stores/workbench-editor-store";
import { EffortPicker } from "@/ui/molecules/effort-picker";
import { ModeSwitch } from "@/ui/molecules/mode-switch";
import { ToolbarSelect } from "@/ui/molecules/toolbar-select";
import { IconButton } from "@/ui/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/ui/primitives/dropdown-menu";
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

const PERMISSION_ICON: Record<CliPermissionMode, LucideIcon> = { DEFAULT: Shield, PLAN: ClipboardList, ACCEPT_EDITS: FilePen, BYPASS: ShieldAlert };

type EffortLevel = Exclude<CliEffort, "DEFAULT">;
/** Mức effort theo loại CLI (khớp `withEffortArgs` ở server: Codex tối đa high). Loại không có trong bảng: ẩn. */
const EFFORT_SUPPORT: Partial<Record<CliAgentKind, readonly EffortLevel[]>> = {
  CLAUDE_CODE: ["LOW", "MEDIUM", "HIGH", "XHIGH", "MAX"],
  ANTIGRAVITY: ["LOW", "MEDIUM", "HIGH", "XHIGH", "MAX"],
  CODEX: ["LOW", "MEDIUM", "HIGH"],
};

/** Mức quyền dạng icon (đổi icon theo mức), bấm mở menu chọn; mức CLI không hỗ trợ bị khoá kèm lý do. */
function PermissionMenu({
  value,
  supported,
  disabled,
  onChange,
}: {
  value: CliPermissionMode;
  supported: readonly CliPermissionMode[] | undefined;
  disabled: boolean;
  onChange: (m: CliPermissionMode) => void;
}) {
  const t = useTranslations("workbench.toolbar");
  const current = supported ? value : "DEFAULT";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          icon={PERMISSION_ICON[current]}
          size="icon-sm"
          disabled={disabled || !supported}
          label={`${t("permissionLabel")}: ${t(`permission.${current}`)}`}
          tooltipSide="top"
          className={current === "BYPASS" ? "text-warning" : undefined}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-72">
        <DropdownMenuLabel>{t("permissionLabel")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={current} onValueChange={(m) => m !== value && onChange(m as CliPermissionMode)}>
          {PERMISSION_MODES.map((m) => {
            const usable = !supported || supported.includes(m);
            const ModeIcon = PERMISSION_ICON[m];
            return (
              <DropdownMenuRadioItem key={m} value={m} disabled={!usable} className="items-start">
                <ModeIcon className="mt-0.5" />
                <span className="flex flex-col">
                  <span>{t(`permission.${m}`)}</span>
                  <span className="text-xs leading-4 text-muted-foreground">{usable ? t(`permissionHint.${m}`) : t("permissionUnsupported")}</span>
                </span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ChatToolbarProps = { workspaceId: string; onOpenSettings: (tab: SettingsTab) => void };

/**
 * Quick Setting Toolbar (ChatToolbar.md, spec 3.4): ModeSwitch API ↔ CLI, chọn nhanh model (API) hoặc CLI profile + mức quyền (icon) + effort,
 * New session / History của phiên chat, số spec trong context, đổi vị trí khung chat, icon Settings mở đúng tab. Đổi nhanh ghi qua `updateSettings`.
 */
export function ChatToolbar({ workspaceId, onOpenSettings }: ChatToolbarProps) {
  const t = useTranslations("workbench.toolbar");
  const { loading, mode, model, profileId, permissionMode, effort, profiles, patch } = useAgentSettings();
  const { busy } = useAgentBusy(workspaceId);
  const context = useContextFiles(workspaceId);

  const profileOptions = React.useMemo(() => profiles.map((p) => ({ value: p.id, label: p.id, hint: p.command })), [profiles]);
  const kind = profiles.find((p) => p.id === profileId)?.kind;
  const supported = kind ? PERMISSION_SUPPORT[kind] : undefined;
  const effortLevels = kind ? EFFORT_SUPPORT[kind] : undefined;

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
          <PermissionMenu value={permissionMode} supported={supported} disabled={loading || busy} onChange={(m) => patch({ permissionMode: m })} />
          {effortLevels ? (
            <EffortPicker value={effort} levels={effortLevels} disabled={loading || busy} onChange={(e) => patch({ effort: e })} />
          ) : null}
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
