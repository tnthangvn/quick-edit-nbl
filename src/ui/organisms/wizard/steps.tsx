"use client";

import * as React from "react";
import { FolderOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type * as z from "zod";
import { SyncStrategy } from "@/client/api/generated/model";
import type { CreateWorkspaceBody } from "@/client/api/generated/zod/workspace/workspace.zod";
import { Field } from "@/ui/molecules/field";
import { Badge } from "@/ui/primitives/badge";
import { IconButton } from "@/ui/primitives/button";
import { Checkbox } from "@/ui/primitives/checkbox";
import { ChoiceCard, ChoiceCardGroup } from "@/ui/primitives/choice-card";
import { Input } from "@/ui/primitives/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ui/primitives/input-group";
import { Switch } from "@/ui/primitives/switch";
import { FolderBrowserDialog } from "@/ui/organisms/filesystem/FolderBrowserDialog";
import { fieldError } from "@/ui/organisms/settings/form-errors";
import { DriveStorageFields, GitStorageFields, GoogleSignIn } from "@/ui/organisms/wizard/StorageFields";

export type WizardForm = z.input<typeof CreateWorkspaceBody>;

/* ---------------------------------------------------------------- 1. Thông tin */

export function InfoStep() {
  const t = useTranslations("wizard.info");
  const { register, formState } = useFormContext<WizardForm>();
  return (
    <>
      <Field label={t("name")} hint={t("nameHint")} error={fieldError(formState.errors, "name")}>
        <Input autoFocus placeholder={t("namePlaceholder")} {...register("name")} />
      </Field>
      <Field label={t("description")} error={fieldError(formState.errors, "description")}>
        <Input placeholder={t("descriptionPlaceholder")} {...register("description")} />
      </Field>
    </>
  );
}

/* ---------------------------------------------------------------- 2. Nơi lưu */

/** Local luôn ngầm định có (path + specsDir dưới); Git/Drive bật thêm độc lập qua 2 switch, không loại trừ nhau. */
export function StorageStep({ onGitToggle, onDriveToggle }: { onGitToggle: (enabled: boolean) => void; onDriveToggle: (enabled: boolean) => void }) {
  const t = useTranslations("wizard.storage");
  const tf = useTranslations("filesystem.browser");
  const { register, control, setValue, getValues, formState } = useFormContext<WizardForm>();
  const git = useWatch({ control, name: "storage.git" });
  const drive = useWatch({ control, name: "storage.drive" });
  const [browserOpen, setBrowserOpen] = React.useState(false);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Field label={t("path")} hint={t("pathHint")} error={fieldError(formState.errors, "path")}>
          <InputGroup>
            <InputGroupInput mono placeholder="/home/you/projects/specs" {...register("path")} />
            <InputGroupAddon align="inline-end">
              <IconButton icon={FolderOpen} size="icon-sm" label={tf("title")} onClick={() => setBrowserOpen(true)} />
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <Field label={t("specsDir")} hint={t("specsDirHint")} error={fieldError(formState.errors, "specsDir")}>
          <Input mono placeholder={t("specsDirPlaceholder")} {...register("specsDir")} />
        </Field>
      </div>
      <FolderBrowserDialog
        open={browserOpen}
        onOpenChange={setBrowserOpen}
        initialPath={getValues("path") || undefined}
        onSelect={(path) => setValue("path", path, { shouldDirty: true, shouldValidate: true })}
      />

      <Field layout="inline" label={t("gitToggle.label")} hint={t("gitToggle.hint")}>
        <Switch checked={Boolean(git)} onCheckedChange={onGitToggle} />
      </Field>
      {git ? <GitStorageFields /> : null}

      <Field layout="inline" label={t("driveToggle.label")} hint={t("driveToggle.hint")}>
        <Switch checked={Boolean(drive)} onCheckedChange={onDriveToggle} />
      </Field>
      {drive ? <DriveStorageFields /> : null}
    </>
  );
}

/* ---------------------------------------------------------------- 3. NotebookLM */

export function NotebookStep({ skip, onSkipChange }: { skip: boolean; onSkipChange: (skip: boolean) => void }) {
  const t = useTranslations("wizard.notebook");
  const { register, control, formState } = useFormContext<WizardForm>();
  const strategy = useWatch({ control, name: "notebook.syncStrategy" }) ?? SyncStrategy.DRIVE_SYNC;
  return (
    <>
      <Checkbox checked={skip} onCheckedChange={(v) => onSkipChange(v === true)}>
        {t("skip")}
      </Checkbox>
      <fieldset disabled={skip} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0 disabled:opacity-55">
        <Field label={t("notebookId")} hint={t("notebookIdHint")} error={fieldError(formState.errors, "notebook.notebookId")}>
          <Input mono placeholder="https://notebooklm.google.com/notebook/…" {...register("notebook.notebookId")} />
        </Field>
        <Field label={t("strategy")}>
          <Controller
            control={control}
            name="notebook.syncStrategy"
            render={({ field }) => (
              <ChoiceCardGroup columns={2} value={field.value ?? SyncStrategy.DRIVE_SYNC} onValueChange={field.onChange} disabled={skip} aria-label={t("strategy")}>
                {Object.values(SyncStrategy).map((s) => (
                  <ChoiceCard key={s} value={s} title={t(`strategies.${s}.title`)} description={t(`strategies.${s}.description`)} />
                ))}
              </ChoiceCardGroup>
            )}
          />
        </Field>
        {strategy === "DRIVE_SYNC" ? (
          <>
            <Field label={t("driveFolder")} hint={t("driveFolderHint")} error={fieldError(formState.errors, "notebook.driveFolderId")}>
              <Input mono placeholder="1AbCdEf…" {...register("notebook.driveFolderId", { setValueAs: (v: string) => (v ? v : null) })} />
            </Field>
            {skip ? null : <GoogleSignIn />}
          </>
        ) : (
          <p className="m-0 text-xs leading-4 text-muted-foreground">{t("rpcHint")}</p>
        )}
        <p className="m-0 text-xs leading-4 text-muted-foreground">{t("mapping")}</p>
        {(["autoSyncOnApprove", "confirmBeforeSync"] as const).map((name) => (
          <Controller
            key={name}
            control={control}
            name={`notebook.${name}`}
            render={({ field }) => (
              <Field layout="inline" label={t(`${name}.label`)}>
                <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} disabled={skip} />
              </Field>
            )}
          />
        ))}
        <p className="m-0 text-xs leading-4 text-muted-foreground">{t("checkLater")}</p>
      </fieldset>
    </>
  );
}

/* ---------------------------------------------------------------- 4. Xem lại */

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 py-2 text-[13px] leading-[18px]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="m-0 min-w-0 break-words">{children}</dd>
    </div>
  );
}

const mono = (v: React.ReactNode) => <code className="font-mono text-xs">{v}</code>;

export function ReviewSummary({ skipNotebook }: { skipNotebook: boolean }) {
  const t = useTranslations("wizard.review");
  const tc = useTranslations("common");
  const tn = useTranslations("wizard.notebook");
  const { control } = useFormContext<WizardForm>();
  const v = useWatch({ control }) as WizardForm;
  const git = v.storage?.git ?? null;
  const drive = v.storage?.drive ?? null;
  const activeTypes = ["LOCAL", ...(git ? (["GIT"] as const) : []), ...(drive ? (["DRIVE"] as const) : [])];
  return (
    <dl className="m-0 divide-y divide-border rounded-lg border border-border bg-card px-4">
      <Row label={t("name")}>{v.name}</Row>
      {v.description ? <Row label={t("description")}>{v.description}</Row> : null}
      <Row label={t("path")}>{mono(v.path)}</Row>
      <Row label={t("storage")}>
        <span className="flex flex-wrap items-center gap-1.5">
          {activeTypes.map((type) => (
            <Badge key={type} size="md" variant={type === "LOCAL" ? "neutral" : "primary"}>
              {tc(`storage.${type}`)}
            </Badge>
          ))}
          {mono(v.specsDir?.trim() ? v.specsDir : t("specsDirRoot"))}
        </span>
      </Row>
      {git ? (
        <>
          <Row label={t("repo")}>
            {mono(`${git.repo ?? git.remote ?? ""}@${git.branch ?? "main"}`)} · {tc(`connector.provider.${git.provider}`)}
          </Row>
          <Row label={t("subdir")}>{mono(git.subdir?.trim() ? git.subdir : t("subdirRoot"))}</Row>
          <Row label={t("publish")}>{git.publishMode === "PULL_REQUEST" ? t("publishPr") : t("publishPush")}</Row>
        </>
      ) : null}
      {drive ? <Row label={t("driveFolder")}>{mono(drive.folderId)}</Row> : null}
      <Row label={t("notebook")}>
        {skipNotebook || !v.notebook?.notebookId ? (
          <span className="text-muted-foreground">{t("notebookLater")}</span>
        ) : (
          <>
            {mono(v.notebook.notebookId)} · {tn(`strategies.${v.notebook.syncStrategy ?? "DRIVE_SYNC"}.title`)}
          </>
        )}
      </Row>
    </dl>
  );
}
