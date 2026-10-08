"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { FilePlus, Pencil, Trash } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { getGetSpecQueryKey, getListSpecsQueryKey, useCreateSpec, useDeleteSpec, useRenameSpec } from "@/client/api/generated";
import { CreateSpecBody, RenameSpecBody } from "@/client/api/generated/zod/spec/spec.zod";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { specFileParam } from "@/client/hooks/use-workspace-events";
import { useWorkbenchEditorStore } from "@/client/stores/workbench-editor-store";
import { Field } from "@/ui/molecules/field";
import { Button } from "@/ui/primitives/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/primitives/dialog";
import { Input } from "@/ui/primitives/input";
import { notify } from "@/ui/primitives/sonner";

/** Lỗi API của form: lỗi theo field (VALIDATION.FAILED) → dưới ô nhập; lỗi nghiệp vụ (SPEC.ALREADY_EXISTS…) → cũng dưới ô nhập. */
function useFieldError() {
  const errorMessage = useErrorMessage();
  return React.useCallback(
    (err: unknown, field: string): string => {
      const info = (err as { info?: { error?: { fields?: Record<string, { code: string }> } } }).info;
      const fieldErr = info?.error?.fields?.[field];
      return errorMessage(fieldErr ? { error: fieldErr } : err);
    },
    [errorMessage],
  );
}

type NewSpecDialogProps = { workspaceId: string; open: boolean; onOpenChange: (open: boolean) => void };

/** + New spec: tạo file .md rỗng trong thư mục spec rồi mở trên Editor. */
export function NewSpecDialog({ workspaceId, open, onOpenChange }: NewSpecDialogProps) {
  const t = useTranslations("workbench.dialogs.new");
  const tc = useTranslations("common.actions");
  const queryClient = useQueryClient();
  const fieldError = useFieldError();
  const form = useForm({ resolver: zodResolver(CreateSpecBody), defaultValues: { file: "", content: "" } });
  const create = useCreateSpec();

  React.useEffect(() => {
    if (open) form.reset({ file: "", content: "" });
  }, [open, form]);

  const submit = form.handleSubmit(async (values) => {
    const file = /\.md$/i.test(values.file) ? values.file : `${values.file}.md`;
    try {
      const spec = await create.mutateAsync({ workspaceId, data: { file, content: values.content || `# ${file.replace(/\.md$/i, "")}\n` } });
      void queryClient.invalidateQueries({ queryKey: getListSpecsQueryKey(workspaceId) });
      useWorkbenchEditorStore.getState().openFile(workspaceId, spec.file);
      notify.info(t("created", { file: spec.file }));
      onOpenChange(false);
    } catch (err) {
      form.setError("file", { message: fieldError(err, "file") });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <form onSubmit={submit} className="contents" noValidate>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label={t("fileLabel")} hint={t("fileHint")} error={form.formState.errors.file?.message ?? null}>
              <Input mono autoFocus placeholder="overview.md" {...form.register("file")} />
            </Field>
          </DialogBody>
          <DialogFooter className="justify-end">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" variant="primary" icon={FilePlus} loading={create.isPending}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type FileDialogProps = { workspaceId: string; file: string | null; onOpenChange: (open: boolean) => void };

/** Rename: đổi tên file (PATCH). Nháp / context / file đang mở chuyển theo tên mới. */
export function RenameSpecDialog({ workspaceId, file, onOpenChange }: FileDialogProps) {
  const t = useTranslations("workbench.dialogs.rename");
  const tc = useTranslations("common.actions");
  const queryClient = useQueryClient();
  const fieldError = useFieldError();
  const form = useForm({ resolver: zodResolver(RenameSpecBody), defaultValues: { newFile: file ?? "" } });
  const rename = useRenameSpec();

  React.useEffect(() => {
    if (file) form.reset({ newFile: file });
  }, [file, form]);

  const submit = form.handleSubmit(async ({ newFile }) => {
    if (!file) return;
    const target = /\.md$/i.test(newFile) ? newFile : `${newFile}.md`;
    if (target === file) return onOpenChange(false);
    try {
      const spec = await rename.mutateAsync({ workspaceId, file: specFileParam(file), data: { newFile: target } });
      useWorkbenchEditorStore.getState().renameFile(workspaceId, file, spec.file);
      queryClient.removeQueries({ queryKey: getGetSpecQueryKey(workspaceId, specFileParam(file)) });
      void queryClient.invalidateQueries({ queryKey: getListSpecsQueryKey(workspaceId) });
      notify.info(t("renamed", { from: file, to: spec.file }));
      onOpenChange(false);
    } catch (err) {
      form.setError("newFile", { message: fieldError(err, "newFile") });
    }
  });

  return (
    <Dialog open={Boolean(file)} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <form onSubmit={submit} className="contents" noValidate>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description", { file: file ?? "" })}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label={t("fileLabel")} error={form.formState.errors.newFile?.message ?? null}>
              <Input mono autoFocus {...form.register("newFile")} />
            </Field>
          </DialogBody>
          <DialogFooter className="justify-end">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" variant="primary" icon={Pencil} loading={rename.isPending}>
              {tc("rename")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Delete spec: luôn hỏi xác nhận (SpecMenu wireframe). Xoá file local; source NotebookLM giữ tới lần sync sau. */
export function DeleteSpecDialog({ workspaceId, file, onOpenChange }: FileDialogProps) {
  const t = useTranslations("workbench.dialogs.delete");
  const tc = useTranslations("common.actions");
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const remove = useDeleteSpec();

  const confirm = async () => {
    if (!file) return;
    try {
      await remove.mutateAsync({ workspaceId, file: specFileParam(file) });
      useWorkbenchEditorStore.getState().removeFile(workspaceId, file);
      queryClient.removeQueries({ queryKey: getGetSpecQueryKey(workspaceId, specFileParam(file)) });
      void queryClient.invalidateQueries({ queryKey: getListSpecsQueryKey(workspaceId) });
      notify.info(t("deleted", { file }));
      onOpenChange(false);
    } catch (err) {
      notify.error(t("failed", { file }), { description: errorMessage(err) });
    }
  };

  return (
    <Dialog open={Boolean(file)} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t("title", { file: file ?? "" })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 justify-end">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" icon={Trash} loading={remove.isPending} onClick={confirm}>
            {tc("deleteSpec")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
