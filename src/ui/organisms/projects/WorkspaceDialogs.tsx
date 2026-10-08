"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { FolderOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import {
  getGetWorkspaceQueryKey,
  getListWorkspacesQueryKey,
  useImportWorkspace,
  useRemoveWorkspace,
  useUpdateWorkspace,
} from "@/client/api/generated";
import type { Workspace } from "@/client/api/generated/model";
import { ImportWorkspaceBody, UpdateWorkspaceBody } from "@/client/api/generated/zod/workspace/workspace.zod";
import { extractApiError, useErrorMessage } from "@/client/api/useErrorMessage";
import { Field } from "@/ui/molecules/field";
import { Button } from "@/ui/primitives/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/primitives/dialog";
import { Input } from "@/ui/primitives/input";
import { notify } from "@/ui/primitives/sonner";
import { apiErrorMap, applyServerFieldErrors, fieldError } from "@/ui/organisms/settings/form-errors";

type BaseProps = { open: boolean; onOpenChange: (open: boolean) => void };

function useInvalidateWorkspaces() {
  const queryClient = useQueryClient();
  return React.useCallback(
    (workspaceId?: string) => {
      void queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey() });
      if (workspaceId) void queryClient.invalidateQueries({ queryKey: getGetWorkspaceQueryKey(workspaceId) });
    },
    [queryClient],
  );
}

/* ---------------------------------------------------------------- Đổi tên / Tìm lại thư mục */

type EditWorkspaceDialogProps = BaseProps & {
  workspace: Workspace | null;
  /** `rename`: tên + mô tả; `locate`: đường dẫn mới (thư mục đã di chuyển). */
  mode: "rename" | "locate";
};

/** PATCH `updateWorkspace`: đổi tên / mô tả, hoặc tìm lại thư mục đã di chuyển (phải có `.spec-studio/config.json`). */
export function EditWorkspaceDialog({ open, onOpenChange, workspace, mode }: EditWorkspaceDialogProps) {
  const t = useTranslations("projects.edit");
  const tc = useTranslations("common.actions");
  const errorMessage = useErrorMessage();
  const invalidate = useInvalidateWorkspaces();
  const form = useForm({ resolver: zodResolver(UpdateWorkspaceBody, apiErrorMap) });
  const { register, handleSubmit, reset, setError, formState } = form;

  React.useEffect(() => {
    if (open && workspace) reset(mode === "rename" ? { name: workspace.name, description: workspace.description ?? "" } : { path: workspace.path });
  }, [open, workspace, mode, reset]);

  const update = useUpdateWorkspace({
    mutation: {
      onSuccess: (ws) => {
        invalidate(ws.id);
        notify.info(mode === "rename" ? t("renamed", { name: ws.name }) : t("located", { name: ws.name }));
        onOpenChange(false);
      },
      onError: (err) => {
        if (!applyServerFieldErrors(err, setError)) notify.error(errorMessage(err));
      },
    },
  });

  const submit = handleSubmit((data) => {
    if (!workspace) return;
    update.mutate({ workspaceId: workspace.id, data });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <form onSubmit={submit} className="contents" noValidate>
          <DialogHeader>
            <DialogTitle>{mode === "rename" ? t("renameTitle") : t("locateTitle")}</DialogTitle>
            <DialogDescription>{mode === "rename" ? t("renameDescription") : t("locateDescription", { path: workspace?.path ?? "" })}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {mode === "rename" ? (
              <>
                <Field label={t("name")} error={fieldError(formState.errors, "name")}>
                  <Input autoFocus {...register("name")} />
                </Field>
                <Field label={t("description")} error={fieldError(formState.errors, "description")}>
                  <Input {...register("description")} />
                </Field>
              </>
            ) : (
              <Field label={t("path")} hint={t("pathHint")} error={fieldError(formState.errors, "path")}>
                <Input mono autoFocus placeholder="/home/you/projects/specs" {...register("path")} />
              </Field>
            )}
          </DialogBody>
          <DialogFooter className="justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={update.isPending}>
              {tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- Gỡ khỏi danh sách */

type RemoveWorkspaceDialogProps = BaseProps & { workspace: Pick<Workspace, "id" | "name" | "path"> | null; onRemoved?: () => void };

/** DELETE `removeWorkspace`: chỉ gỡ khỏi registry, không xoá file. */
export function RemoveWorkspaceDialog({ open, onOpenChange, workspace, onRemoved }: RemoveWorkspaceDialogProps) {
  const t = useTranslations("projects.remove");
  const tc = useTranslations("common.actions");
  const errorMessage = useErrorMessage();
  const invalidate = useInvalidateWorkspaces();
  const remove = useRemoveWorkspace({
    mutation: {
      onSuccess: () => {
        invalidate();
        notify.info(t("removed", { name: workspace?.name ?? "" }));
        onOpenChange(false);
        onRemoved?.();
      },
      onError: (err) => notify.error(errorMessage(err)),
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", { name: workspace?.name ?? "" })}</DialogDescription>
        </DialogHeader>
        <DialogBody className="py-3">
          <p className="m-0 truncate font-mono text-xs text-muted-foreground" title={workspace?.path}>
            {workspace?.path}
          </p>
        </DialogBody>
        <DialogFooter className="justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" loading={remove.isPending} onClick={() => workspace && remove.mutate({ workspaceId: workspace.id })}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- Mở thư mục có sẵn (import) */

/** POST `importWorkspace`: thêm thư mục đã có `.spec-studio/config.json`. Trùng tên → cho đặt tên khác. */
export function ImportWorkspaceDialog({ open, onOpenChange, onImported }: BaseProps & { onImported?: (ws: Workspace) => void }) {
  const t = useTranslations("projects.import");
  const tc = useTranslations("common.actions");
  const errorMessage = useErrorMessage();
  const invalidate = useInvalidateWorkspaces();
  const { register, handleSubmit, reset, setError, formState } = useForm({
    resolver: zodResolver(ImportWorkspaceBody, apiErrorMap),
    defaultValues: { path: "" },
  });

  React.useEffect(() => {
    if (open) reset({ path: "" });
  }, [open, reset]);

  const importWs = useImportWorkspace({
    mutation: {
      onSuccess: (ws) => {
        invalidate();
        notify.info(t("imported", { name: ws.name }));
        onOpenChange(false);
        onImported?.(ws);
      },
      onError: (err) => {
        if (applyServerFieldErrors(err, setError)) return;
        const e = extractApiError(err);
        // Lỗi nghiệp vụ (không có config.json, đã có trong danh sách…) hiện ngay dưới ô đường dẫn.
        if (e && e.code !== "INTERNAL.UNEXPECTED") setError("path", { type: "server", message: JSON.stringify({ code: e.code, params: e.params }) });
        else notify.error(errorMessage(err));
      },
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <form
          className="contents"
          noValidate
          onSubmit={handleSubmit((data) => importWs.mutate({ data: { path: data.path.trim(), name: data.name?.trim() || undefined } }))}
        >
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label={t("path")} hint={t("pathHint")} error={fieldError(formState.errors, "path")}>
              <Input mono autoFocus placeholder="/home/you/projects/specs" {...register("path")} />
            </Field>
            <Field label={t("name")} hint={t("nameHint")} error={fieldError(formState.errors, "name")}>
              <Input {...register("name", { setValueAs: (v: string) => (v ? v : undefined) })} />
            </Field>
          </DialogBody>
          <DialogFooter className="justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" variant="primary" icon={FolderOpen} loading={importWs.isPending}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
