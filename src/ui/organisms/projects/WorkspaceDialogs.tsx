"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Trash2, TriangleAlert } from "lucide-react";
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
import { Checkbox } from "@/ui/primitives/checkbox";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/primitives/dialog";
import { Icon } from "@/ui/primitives/icon";
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

const DELETE_WORD = "delete";

/**
 * DELETE `removeWorkspace`. Mặc định chỉ gỡ khỏi danh sách (file giữ nguyên). Tick "Xoá luôn thư mục trên máy" thì phải gõ
 * `delete` mới bấm được: xoá vĩnh viễn thư mục làm việc ở local, không đụng Git remote / Google Drive / NotebookLM.
 */
export function RemoveWorkspaceDialog({ open, onOpenChange, workspace, onRemoved }: RemoveWorkspaceDialogProps) {
  const t = useTranslations("projects.remove");
  const tc = useTranslations("common.actions");
  const errorMessage = useErrorMessage();
  const invalidate = useInvalidateWorkspaces();
  const [deleteFiles, setDeleteFiles] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  // Mở lại dialog: quay về chỉ gỡ khỏi danh sách.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDeleteFiles(false);
      setTyped("");
    }
  }
  const confirmed = !deleteFiles || typed.trim() === DELETE_WORD;

  const remove = useRemoveWorkspace({
    mutation: {
      onSuccess: () => {
        invalidate();
        notify.info(deleteFiles ? t("deleted", { name: workspace?.name ?? "" }) : t("removed", { name: workspace?.name ?? "" }));
        onOpenChange(false);
        onRemoved?.();
      },
      onError: (err) => notify.error(errorMessage(err)),
    },
  });

  const submit = () => {
    if (!workspace || !confirmed) return;
    remove.mutate({ workspaceId: workspace.id, params: deleteFiles ? { deleteFiles: "true", confirm: typed.trim() } : undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t(deleteFiles ? "descriptionDelete" : "description", { name: workspace?.name ?? "" })}</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-3 py-3">
          <p className="m-0 truncate font-mono text-xs text-muted-foreground" title={workspace?.path}>
            {workspace?.path}
          </p>
          <Checkbox checked={deleteFiles} onCheckedChange={(v) => setDeleteFiles(v === true)}>
            {t("deleteFiles")}
          </Checkbox>
          {deleteFiles ? (
            <div role="alert" className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive-soft px-3 py-2.5">
              <p className="m-0 flex items-start gap-1.5 text-xs leading-[18px] text-destructive">
                <Icon icon={TriangleAlert} size="sm" className="mt-px" />
                <span>{t("deleteWarning")}</span>
              </p>
              <ul className="m-0 list-disc pl-5 text-xs leading-[18px] text-foreground">
                <li>{t.rich("deleteWhat", { path: workspace?.path ?? "", code: (c) => <code className="font-mono">{c}</code> })}</li>
                <li>{t("deleteKeep")}</li>
              </ul>
              <Field label={t.rich("typeToConfirm", { word: DELETE_WORD, code: (c) => <code className="font-mono font-semibold text-destructive">{c}</code> })}>
                <Input
                  mono
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  value={typed}
                  placeholder={DELETE_WORD}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submit();
                    }
                  }}
                />
              </Field>
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter className="justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" icon={deleteFiles ? Trash2 : undefined} loading={remove.isPending} disabled={!confirmed} onClick={submit}>
            {deleteFiles ? t("confirmDelete") : t("confirm")}
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
