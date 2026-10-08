"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, FolderPlus, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FormProvider, useForm, type FieldPath } from "react-hook-form";
import { getListWorkspacesQueryKey, useCheckWorkspace, useCreateWorkspace, useOpenWorkspace } from "@/client/api/generated";
import type { Workspace, WorkspaceCheckItem } from "@/client/api/generated/model";
import {
  CreateWorkspaceBody,
  createWorkspaceBodyNotebookOneAutoSyncOnApproveDefault,
  createWorkspaceBodyNotebookOneConfirmBeforeSyncDefault,
  createWorkspaceBodyNotebookOneSyncStrategyDefault,
  createWorkspaceBodySpecsDirDefault,
  createWorkspaceBodyStorageDriveOnePullOnOpenDefault,
  createWorkspaceBodyStorageDriveOnePushOnApproveDefault,
  createWorkspaceBodyStorageGitOneAutoCommitDefault,
  createWorkspaceBodyStorageGitOneAutoPushDefault,
  createWorkspaceBodyStorageGitOneBranchDefault,
  createWorkspaceBodyStorageGitOneCommitMessageDefault,
  createWorkspaceBodyStorageGitOnePrBranchTemplateDefault,
  createWorkspaceBodyStorageGitOnePublishModeDefault,
  createWorkspaceBodyStorageGitOnePullOnOpenDefault,
  createWorkspaceBodyStorageGitOneSubdirDefault,
} from "@/client/api/generated/zod/workspace/workspace.zod";
import { extractApiError, useErrorMessage } from "@/client/api/useErrorMessage";
import { Stepper, type StepperItem, type StepStatus } from "@/ui/molecules/stepper";
import { Button } from "@/ui/primitives/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/primitives/dialog";
import { notify } from "@/ui/primitives/sonner";
import { apiErrorMap, applyServerFieldErrors } from "@/ui/organisms/settings/form-errors";
import { InfoStep, NotebookStep, ReviewSummary, StorageStep, type WizardForm } from "@/ui/organisms/wizard/steps";

/**
 * Kiểm tra thêm phía giao diện (schema API để mềm vì BE tự suy ra): Git phải có repo (khi chọn connector) hoặc Repo URL;
 * Drive phải có Folder ID/URL.
 */
const WizardSchema = CreateWorkspaceBody.superRefine((v, ctx) => {
  const g = v.storage.git;
  if (g) {
    if (g.connectorId && !g.repo) ctx.addIssue({ code: "custom", path: ["storage", "git", "repo"], message: "FIELD.REQUIRED" });
    if (!g.connectorId && !g.remote) ctx.addIssue({ code: "custom", path: ["storage", "git", "remote"], message: "FIELD.REQUIRED" });
  }
  if (v.storage.drive && !v.storage.drive.folderId.trim()) {
    ctx.addIssue({ code: "custom", path: ["storage", "drive", "folderId"], message: "FIELD.REQUIRED" });
  }
});

type GitDraft = NonNullable<WizardForm["storage"]["git"]>;
type DriveDraft = NonNullable<WizardForm["storage"]["drive"]>;

const GIT_DEFAULTS: GitDraft = {
  provider: "GITHUB",
  connectorId: null,
  repo: null,
  branch: createWorkspaceBodyStorageGitOneBranchDefault,
  subdir: createWorkspaceBodyStorageGitOneSubdirDefault,
  publishMode: createWorkspaceBodyStorageGitOnePublishModeDefault,
  prBranchTemplate: createWorkspaceBodyStorageGitOnePrBranchTemplateDefault,
  autoCommit: createWorkspaceBodyStorageGitOneAutoCommitDefault,
  autoPush: createWorkspaceBodyStorageGitOneAutoPushDefault,
  commitMessage: createWorkspaceBodyStorageGitOneCommitMessageDefault,
  pullOnOpen: createWorkspaceBodyStorageGitOnePullOnOpenDefault,
};
const DRIVE_DEFAULTS: DriveDraft = {
  folderId: "",
  pullOnOpen: createWorkspaceBodyStorageDriveOnePullOnOpenDefault,
  pushOnApprove: createWorkspaceBodyStorageDriveOnePushOnApproveDefault,
};
const DEFAULTS: WizardForm = {
  name: "",
  description: "",
  path: "",
  specsDir: createWorkspaceBodySpecsDirDefault,
  storage: { git: null, drive: null, shareConfig: false },
  notebook: {
    notebookId: "",
    syncStrategy: createWorkspaceBodyNotebookOneSyncStrategyDefault,
    driveFolderId: null,
    autoSyncOnApprove: createWorkspaceBodyNotebookOneAutoSyncOnApproveDefault,
    confirmBeforeSync: createWorkspaceBodyNotebookOneConfirmBeforeSyncDefault,
  },
};

const STEPS = ["info", "storage", "notebook", "review"] as const;
type StepIndex = 0 | 1 | 2 | 3;
const STEP_FIELDS: Record<StepIndex, FieldPath<WizardForm>[]> = {
  0: ["name", "description"],
  1: ["path", "specsDir", "storage"],
  2: ["notebook"],
  3: [],
};

/** Mã lỗi nghiệp vụ của `createWorkspace` → field + bước để hiện lỗi đúng chỗ. */
const CODE_FIELD: Record<string, FieldPath<WizardForm>> = {
  "WORKSPACE.NAME_TAKEN": "name",
  "WORKSPACE.PATH_IN_USE": "path",
  "WORKSPACE.CONFIG_EXISTS": "path",
  "WORKSPACE.FOLDER_NOT_WRITABLE": "path",
  "WORKSPACE.FOLDER_NOT_EMPTY": "path",
  "WORKSPACE.FOLDER_NOT_FOUND": "path",
  "WORKSPACE.INVALID_PATH": "path",
  "WORKSPACE.INVALID_SPECS_DIR": "specsDir",
  "WORKSPACE.INVALID_GIT_REMOTE": "storage.git.remote",
  "WORKSPACE.INVALID_BRANCH": "storage.git.branch",
  "WORKSPACE.GIT_BRANCH_NOT_FOUND": "storage.git.branch",
  "WORKSPACE.INVALID_REPO": "storage.git.repo",
};
const stepOfField = (path: string): StepIndex => (path.startsWith("notebook") ? 2 : /^(path|specsDir|storage)/.test(path) ? 1 : 0);

type RunPhase = "CREATE" | "CHECK" | "OPEN";
type RunState = { phase: RunPhase; failed: boolean; workspace: Workspace | null; checks: WorkspaceCheckItem[]; error: unknown };

type NewProjectDialogProps = { open: boolean; onOpenChange: (open: boolean) => void };

/**
 * Wizard + New Project (spec 3.0.1): Thông tin → Nơi lưu → NotebookLM → Xem lại & Tạo.
 * Mỗi bước validate bằng schema `createWorkspace` sinh ra. Bấm Tạo: `createWorkspace` → `checkWorkspace`
 * (thư mục, Git remote, quyền Drive, notebook) → `openWorkspace` rồi chuyển sang `/w/<id>`; lỗi ở bước nào dừng ở bước đó kèm Thử lại.
 */
export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const t = useTranslations("wizard");
  const tc = useTranslations("common.actions");
  const router = useRouter();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const form = useForm<WizardForm>({ resolver: zodResolver(WizardSchema, apiErrorMap), defaultValues: DEFAULTS, shouldUnregister: false });
  const { trigger, getValues, setValue, reset, setError, handleSubmit, clearErrors } = form;
  const [step, setStep] = React.useState<StepIndex>(0);
  const [skipNotebook, setSkipNotebook] = React.useState(false);
  const [run, setRun] = React.useState<RunState | null>(null);
  const drafts = React.useRef<{ git: GitDraft; drive: DriveDraft }>({ git: GIT_DEFAULTS, drive: DRIVE_DEFAULTS });

  React.useEffect(() => {
    if (!open) return;
    reset(DEFAULTS);
    drafts.current = { git: GIT_DEFAULTS, drive: DRIVE_DEFAULTS };
    setStep(0);
    setSkipNotebook(false);
    setRun(null);
  }, [open, reset]);

  const createWs = useCreateWorkspace();
  const checkWs = useCheckWorkspace();
  const openWs = useOpenWorkspace();
  const running = createWs.isPending || checkWs.isPending || openWs.isPending;

  const toggleGit = (enabled: boolean) => {
    const current = getValues("storage.git");
    if (current) drafts.current.git = current;
    clearErrors("storage.git");
    setValue("storage.git", enabled ? drafts.current.git : null, { shouldDirty: true });
  };
  const toggleDrive = (enabled: boolean) => {
    const current = getValues("storage.drive");
    if (current) drafts.current.drive = current;
    clearErrors("storage.drive");
    setValue("storage.drive", enabled ? drafts.current.drive : null, { shouldDirty: true });
  };

  const next = async () => {
    if (step === 2 && !skipNotebook && !getValues("notebook.notebookId")?.trim()) {
      setError("notebook.notebookId", { type: "custom", message: JSON.stringify({ code: "FIELD.REQUIRED" }) }, { shouldFocus: true });
      return;
    }
    const ok = step === 2 && skipNotebook ? true : await trigger(STEP_FIELDS[step], { shouldFocus: true });
    if (ok && step < 3) setStep((step + 1) as StepIndex);
  };

  const finishOpen = async (ws: Workspace) => {
    setRun((r) => (r ? { ...r, phase: "OPEN", failed: false, error: null } : r));
    try {
      await openWs.mutateAsync({ workspaceId: ws.id });
      void queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey() });
      notify.info(t("run.created", { name: ws.name }));
      onOpenChange(false);
      router.push(`/w/${ws.id}`);
    } catch (err) {
      setRun((r) => (r ? { ...r, failed: true, error: err } : r));
    }
  };

  const runCheck = async (ws: Workspace) => {
    setRun((r) => (r ? { ...r, phase: "CHECK", failed: false, error: null, checks: [] } : r));
    try {
      const res = await checkWs.mutateAsync({ workspaceId: ws.id });
      const failed = res.items.some((i) => i.status === "ERROR");
      setRun((r) => (r ? { ...r, checks: res.items, failed } : r));
      if (!failed) await finishOpen(ws);
    } catch (err) {
      setRun((r) => (r ? { ...r, failed: true, error: err } : r));
    }
  };

  const create = handleSubmit(async (data) => {
    const body = { ...data, notebook: skipNotebook || !data.notebook?.notebookId ? null : data.notebook };
    setRun({ phase: "CREATE", failed: false, workspace: null, checks: [], error: null });
    try {
      const ws = await createWs.mutateAsync({ data: body });
      void queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey() });
      setRun((r) => (r ? { ...r, workspace: ws } : r));
      await runCheck(ws);
    } catch (err) {
      // Lỗi field (422) hoặc lỗi nghiệp vụ gắn được vào field → quay về bước chứa field đó.
      let firstKey: string | null = null;
      const mapped = applyServerFieldErrors(err, setError, (k) => {
        firstKey ??= k;
        return k;
      });
      const e = extractApiError(err);
      const codeField = e ? CODE_FIELD[e.code] : undefined;
      if (codeField) {
        setError(codeField, { type: "server", message: JSON.stringify({ code: e!.code, params: e!.params }) });
        firstKey ??= codeField;
      }
      if (mapped || codeField) {
        setRun(null);
        setStep(stepOfField(firstKey ?? ""));
        return;
      }
      setRun((r) => (r ? { ...r, failed: true, error: err } : r));
    }
  });

  const retry = () => {
    if (!run) return;
    if (run.workspace && run.phase !== "CREATE") {
      if (run.phase === "OPEN") void finishOpen(run.workspace);
      else void runCheck(run.workspace);
    } else void create();
  };

  const close = (next: boolean) => {
    if (!next && running) return;
    onOpenChange(next);
  };

  /* ------------------------------------------------ hiển thị */

  const storage = form.watch("storage");
  const activeStorageTypes = [...(storage.git ? (["GIT"] as const) : []), ...(storage.drive ? (["DRIVE"] as const) : [])];
  const createTitle = activeStorageTypes.length ? activeStorageTypes.map((k) => t(`run.create.${k}`)).join(" + ") : t("run.create.LOCAL");
  const navItems: StepperItem[] = STEPS.map((id, i) => ({
    id,
    title: t(`steps.${id}.title`),
    description: t(`steps.${id}.description`),
    status: run ? "DONE" : i < step ? "DONE" : i === step ? "CURRENT" : "TODO",
  }));

  const phaseOrder: RunPhase[] = ["CREATE", "CHECK", "OPEN"];
  const statusOf = (phase: RunPhase): StepStatus => {
    if (!run) return "TODO";
    const at = phaseOrder.indexOf(run.phase);
    const me = phaseOrder.indexOf(phase);
    if (me < at) return "DONE";
    if (me > at) return "TODO";
    return run.failed ? "ERROR" : "RUNNING";
  };
  const runItems: StepperItem[] = run
    ? [
        {
          id: "CREATE",
          title: createTitle,
          description: statusOf("CREATE") === "ERROR" ? errorMessage(run.error) : t("run.createDescription"),
          status: statusOf("CREATE"),
        },
        ...(run.workspace
          ? [
              {
                id: "CHECK",
                title: t("run.check"),
                description:
                  run.phase === "CHECK" && run.error
                    ? errorMessage(run.error)
                    : run.checks.length > 0
                      ? run.checks
                          .map((c) => `${t(`run.target.${c.target}`)}: ${c.error ? errorMessage({ error: c.error }) : t(`run.checkStatus.${c.status}`)}`)
                          .join(" · ")
                      : t("run.checkDescription"),
                status: statusOf("CHECK"),
              },
              {
                id: "OPEN",
                title: t("run.open"),
                description: run.phase === "OPEN" && run.error ? errorMessage(run.error) : `/w/${run.workspace.id}`,
                status: statusOf("OPEN"),
              },
            ]
          : []),
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent size="lg" height="wizard" onInteractOutside={(e) => e.preventDefault()}>
        <FormProvider {...form}>
          <form
            className="contents"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (step < 3) void next();
              else if (!run) void create();
            }}
          >
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>{t("description")}</DialogDescription>
            </DialogHeader>
            <div className="flex min-h-0 flex-1 border-t border-border">
              <nav aria-label={t("stepsLabel")} className="hidden w-[220px] shrink-0 border-r border-border bg-sidebar px-5 py-4 sm:block">
                <Stepper items={navItems} />
              </nav>
              <DialogBody key={step} className="animate-[pop-in_var(--duration-slow)_var(--ease-out)]">
                <h3 className="m-0 text-sm leading-5 font-semibold sm:hidden">{t(`steps.${STEPS[step]}.title`)}</h3>
                {step === 0 ? <InfoStep /> : null}
                {step === 1 ? <StorageStep onGitToggle={toggleGit} onDriveToggle={toggleDrive} /> : null}
                {step === 2 ? <NotebookStep skip={skipNotebook} onSkipChange={setSkipNotebook} /> : null}
                {step === 3 ? (
                  <>
                    <ReviewSummary skipNotebook={skipNotebook} />
                    {run ? (
                      <section aria-live="polite" className="flex flex-col gap-1">
                        <h3 className="m-0 text-sm leading-5 font-semibold">{t("run.title")}</h3>
                        <Stepper items={runItems} />
                      </section>
                    ) : (
                      <p className="m-0 text-xs leading-4 text-muted-foreground">{t("review.hint")}</p>
                    )}
                  </>
                ) : null}
              </DialogBody>
            </div>
            <DialogFooter>
              <span className="flex-1 text-xs text-muted-foreground">{t("stepOf", { current: step + 1, total: STEPS.length })}</span>
              <Button variant="ghost" disabled={running} onClick={() => onOpenChange(false)}>
                {tc("cancel")}
              </Button>
              {step > 0 && !(run && run.workspace) ? (
                <Button
                  variant="outline"
                  icon={ArrowLeft}
                  disabled={running}
                  onClick={() => {
                    setRun(null);
                    setStep((step - 1) as StepIndex);
                  }}
                >
                  {t("back")}
                </Button>
              ) : null}
              {step < 3 ? (
                <Button type="submit" variant="primary" icon={ArrowRight}>
                  {t("next")}
                </Button>
              ) : run?.failed ? (
                <>
                  {run.phase === "CHECK" && run.workspace && !run.error ? (
                    <Button variant="outline" onClick={() => run.workspace && void finishOpen(run.workspace)}>
                      {t("run.openAnyway")}
                    </Button>
                  ) : null}
                  <Button variant="primary" icon={RotateCw} onClick={retry}>
                    {tc("retry")}
                  </Button>
                </>
              ) : (
                <Button type="submit" variant="primary" icon={FolderPlus} loading={running || Boolean(run && !run.failed)} loadingText={t("creating")}>
                  {t("create")}
                </Button>
              )}
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
