"use client";

import * as React from "react";
import { Copy, Trash } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormContext, useWatch } from "react-hook-form";
import type { Workspace } from "@/client/api/generated/model";
import {
  createWorkspaceBodyStorageGitOneCommitMessageDefault,
  createWorkspaceBodyStorageGitOnePrBranchTemplateDefault,
} from "@/client/api/generated/zod/workspace/workspace.zod";
import { useFlash } from "@/client/hooks/use-flash";
import { Field } from "@/ui/molecules/field";
import { Button, IconButton } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ui/primitives/input-group";
import { Switch } from "@/ui/primitives/switch";
import { DEFAULT_HOST } from "@/ui/organisms/connectors/connector-utils";
import { fieldError } from "@/ui/organisms/settings/form-errors";
import type { ConfigForm } from "@/ui/organisms/settings/tabs/NotebookTab";
import { DriveStorageFields, GitStorageFields } from "@/ui/organisms/wizard/StorageFields";

/**
 * Tab 4 — Workspace & Storage (spec 4): tên, thư mục làm việc (chỉ đọc), Specs Dir, Local luôn có + Git/Drive bật
 * thêm độc lập, vùng nguy hiểm "Gỡ Workspace khỏi danh sách".
 */
export function WorkspaceTab({ workspace, onRemove }: { workspace?: Workspace; onRemove: () => void }) {
  const t = useTranslations("settings.workspace");
  const tw = useTranslations("wizard.storage");
  const { control, register, setValue, getValues, formState } = useFormContext<ConfigForm>();
  const git = useWatch({ control, name: "storage.git" });
  const drive = useWatch({ control, name: "storage.drive" });
  const [copied, flashCopied] = useFlash();

  const toggleGit = (enabled: boolean) => {
    // Giữ cấu hình cũ (nếu có); lần đầu bật thì điền mặc định để form hợp lệ.
    if (enabled && !getValues("storage.git")) {
      setValue(
        "storage.git",
        {
          provider: "GITHUB",
          host: DEFAULT_HOST.GITHUB ?? "github.com",
          connectorId: null,
          repo: null,
          remote: "",
          branch: "main",
          subdir: "",
          publishMode: "PUSH",
          prBranchTemplate: createWorkspaceBodyStorageGitOnePrBranchTemplateDefault,
          autoCommit: true,
          autoPush: false,
          commitMessage: createWorkspaceBodyStorageGitOneCommitMessageDefault,
          pullOnOpen: true,
        },
        { shouldDirty: true },
      );
    } else if (!enabled) {
      setValue("storage.git", null, { shouldDirty: true });
    }
  };
  const toggleDrive = (enabled: boolean) => {
    if (enabled && !getValues("storage.drive")) {
      setValue("storage.drive", { folderId: "", pullOnOpen: true, pushOnApprove: true }, { shouldDirty: true });
    } else if (!enabled) {
      setValue("storage.drive", null, { shouldDirty: true });
    }
  };

  const copyPath = async () => {
    if (!workspace) return;
    try {
      await navigator.clipboard.writeText(workspace.path);
      flashCopied();
    } catch {
      // trình duyệt chặn clipboard: người dùng vẫn chọn được chữ trong ô
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("name")} error={fieldError(formState.errors, "workspace.name")}>
          <Input {...register("workspace.name")} />
        </Field>
        <Field label={t("specsDir")} error={fieldError(formState.errors, "workspace.specsDir")}>
          <Input mono {...register("workspace.specsDir")} />
        </Field>
      </div>
      <Field label={t("path")} hint={t("pathHint")}>
        <InputGroup>
          <InputGroupInput mono readOnly value={workspace?.path ?? ""} onFocus={(e) => e.currentTarget.select()} />
          <InputGroupAddon align="inline-end">
            <IconButton icon={Copy} size="icon-sm" label={copied ? t("copied") : t("copyPath")} active={copied} onClick={copyPath} />
          </InputGroupAddon>
        </InputGroup>
      </Field>

      <Field layout="inline" label={tw("gitToggle.label")} hint={tw("gitToggle.hint")}>
        <Switch checked={Boolean(git)} onCheckedChange={toggleGit} />
      </Field>
      {git ? <GitStorageFields /> : null}

      <Field layout="inline" label={tw("driveToggle.label")} hint={tw("driveToggle.hint")}>
        <Switch checked={Boolean(drive)} onCheckedChange={toggleDrive} />
      </Field>
      {drive ? <DriveStorageFields workspaceId={workspace?.id} /> : null}

      <section className="mt-2 flex items-center gap-3 rounded-lg border border-destructive-soft bg-card p-3">
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-[13px] leading-[18px] font-medium text-destructive">{t("dangerTitle")}</h3>
          <p className="m-0 mt-0.5 text-xs leading-4 text-muted-foreground">{t("dangerDescription")}</p>
        </div>
        <Button variant="outline" size="sm" icon={Trash} onClick={onRemove}>
          {t("remove")}
        </Button>
      </section>
    </>
  );
}
