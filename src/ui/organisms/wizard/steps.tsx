"use client";

import * as React from "react";
import { Cloud, FileText, GitBranch } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type * as z from "zod";
import { StorageType, SyncStrategy } from "@/client/api/generated/model";
import type { CreateWorkspaceBody } from "@/client/api/generated/zod/workspace/workspace.zod";
import { Field } from "@/ui/molecules/field";
import { Badge } from "@/ui/primitives/badge";
import { Checkbox } from "@/ui/primitives/checkbox";
import { ChoiceCard, ChoiceCardGroup } from "@/ui/primitives/choice-card";
import { Icon } from "@/ui/primitives/icon";
import { Input } from "@/ui/primitives/input";
import { Switch } from "@/ui/primitives/switch";
import { fieldError } from "@/ui/organisms/settings/form-errors";
import { DriveStorageFields, GitStorageFields, GoogleSignIn } from "@/ui/organisms/wizard/StorageFields";

export type WizardForm = z.input<typeof CreateWorkspaceBody>;

const STORAGE_ICON = { LOCAL: FileText, GIT: GitBranch, DRIVE: Cloud } as const;

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

export function StorageStep({ onTypeChange }: { onTypeChange: (type: StorageType) => void }) {
  const t = useTranslations("wizard.storage");
  const { register, control, formState } = useFormContext<WizardForm>();
  const type = useWatch({ control, name: "storage.type" });
  return (
    <>
      <Field label={t("where")}>
        <ChoiceCardGroup value={type} onValueChange={(v) => onTypeChange(v as StorageType)} aria-label={t("where")}>
          {Object.values(StorageType).map((st) => (
            <ChoiceCard
              key={st}
              value={st}
              title={t(`types.${st}.title`)}
              description={t(`types.${st}.description`)}
              trailing={<Icon icon={STORAGE_ICON[st]} tone="muted" />}
            />
          ))}
        </ChoiceCardGroup>
      </Field>

      <div data-cols={type === "GIT" ? 1 : 2} className="grid grid-cols-1 gap-4 data-[cols=2]:sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Field label={t(`path.${type}`)} hint={t("pathHint")} error={fieldError(formState.errors, "path")}>
          <Input mono placeholder={type === "GIT" ? "/home/you/spec-studio/specs" : "/home/you/projects/specs"} {...register("path")} />
        </Field>
        {type !== "GIT" ? (
          <Field label={t("specsDir")} error={fieldError(formState.errors, "specsDir")}>
            <Input mono placeholder="./specs" {...register("specsDir")} />
          </Field>
        ) : null}
      </div>

      {type === "GIT" ? <GitStorageFields /> : null}
      {type === "DRIVE" ? <DriveStorageFields /> : null}
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
  const storage = v.storage;
  const git = storage?.type === "GIT" ? storage.git : null;
  const drive = storage?.type === "DRIVE" ? storage.drive : null;
  return (
    <dl className="m-0 divide-y divide-border rounded-lg border border-border bg-card px-4">
      <Row label={t("name")}>{v.name}</Row>
      {v.description ? <Row label={t("description")}>{v.description}</Row> : null}
      <Row label={t("path")}>{mono(v.path)}</Row>
      <Row label={t("storage")}>
        <span className="flex flex-wrap items-center gap-1.5">
          {storage ? (
            <Badge size="md" variant={storage.type === "LOCAL" ? "neutral" : "primary"}>
              <Icon icon={STORAGE_ICON[storage.type]} size="xs" />
              {tc(`storage.${storage.type}`)}
            </Badge>
          ) : null}
          {storage?.type !== "GIT" ? mono(v.specsDir ?? "./specs") : null}
        </span>
      </Row>
      {git ? (
        <>
          <Row label={t("repo")}>
            {mono(`${git.repo ?? git.remote ?? ""}@${git.branch ?? "main"}`)} · {tc(`connector.provider.${git.provider}`)}
          </Row>
          <Row label={t("subdir")}>{mono(git.subdir || ".")}</Row>
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
