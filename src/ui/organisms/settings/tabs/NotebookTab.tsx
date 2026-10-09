"use client";

import * as React from "react";
import { CircleCheck, SearchCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type * as z from "zod";
import { revealWorkspaceSecret, useCheckNotebook } from "@/client/api/generated";
import { SyncStrategy, type NotebookCheckResult, type WorkspaceSecretKind } from "@/client/api/generated/model";
import type { UpdateWorkspaceConfigBody } from "@/client/api/generated/zod/setting/setting.zod";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { Field } from "@/ui/molecules/field";
import { SecretInput } from "@/ui/molecules/secret-input";
import { notify } from "@/ui/primitives/sonner";
import { Button } from "@/ui/primitives/button";
import { ChoiceCard, ChoiceCardGroup } from "@/ui/primitives/choice-card";
import { Icon } from "@/ui/primitives/icon";
import { Input } from "@/ui/primitives/input";
import { Switch } from "@/ui/primitives/switch";
import { fieldError } from "@/ui/organisms/settings/form-errors";
import { GoogleSignIn } from "@/ui/organisms/wizard/StorageFields";

export type ConfigForm = z.input<typeof UpdateWorkspaceConfigBody>;

/** Secret NotebookLM chỉ ghi, giữ ở state của dialog tới khi bấm Save. */
export type NotebookSecrets = Partial<Record<Extract<WorkspaceSecretKind, "NOTEBOOK_COOKIE" | "NOTEBOOK_TOKEN">, string>>;

const nullIfEmpty = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

type NotebookTabProps = {
  workspaceId: string;
  secrets: NotebookSecrets;
  onSecretsChange: (next: NotebookSecrets) => void;
  /** Loại secret nào đã lưu (từ `listWorkspaceSecrets`). */
  secretSet: Partial<Record<WorkspaceSecretKind, boolean>>;
  /** Bản che của secret đã lưu (từ `listWorkspaceSecrets`). */
  secretMasked: Partial<Record<WorkspaceSecretKind, string | null>>;
};

/** Tab 3 — NotebookLM Synchronization (spec 4): Notebook ID, Sync Strategy (Drive Sync / Cookie RPC), secret chỉ ghi, tự động hoá. */
export function NotebookTab({ workspaceId, secrets, onSecretsChange, secretSet, secretMasked }: NotebookTabProps) {
  const t = useTranslations("settings.notebook");
  const errorMessage = useErrorMessage();
  const { control, register, getValues, formState } = useFormContext<ConfigForm>();
  const strategy = useWatch({ control, name: "nbl.syncStrategy" });
  const [result, setResult] = React.useState<NotebookCheckResult | null>(null);
  const check = useCheckNotebook({ mutation: { onSuccess: setResult, onError: () => setResult(null) } });

  const revealProps = (kind: WorkspaceSecretKind) => ({
    isSet: secretSet[kind],
    masked: secretMasked[kind],
    onReveal: async () => (await revealWorkspaceSecret(workspaceId, kind)).value,
    onRevealError: (err: unknown) => notify.error(errorMessage(err)),
  });

  const runCheck = () => {
    const nbl = getValues("nbl");
    check.mutate({ workspaceId, data: { ...(nbl.notebookId ? { notebookId: nbl.notebookId } : {}), syncStrategy: nbl.syncStrategy } });
  };

  return (
    <>
      <Field
        label={t("notebookId")}
        hint={check.isError || result ? undefined : t("notebookIdHint")}
        error={check.isError ? errorMessage(check.error) : result && !result.ok ? t("checkFailed") : fieldError(formState.errors, "nbl.notebookId")}
      >
        <div className="flex gap-2">
          <Input mono className="flex-1" placeholder="https://notebooklm.google.com/notebook/…" {...register("nbl.notebookId", { setValueAs: nullIfEmpty })} />
          <Button variant="secondary" icon={SearchCheck} loading={check.isPending} onClick={runCheck}>
            {t("check")}
          </Button>
        </div>
      </Field>
      {result?.ok ? (
        <p className="m-0 -mt-3 flex animate-scale-in items-center gap-1.5 text-xs text-primary">
          <Icon icon={CircleCheck} size="xs" />
          {t("checkOk", { title: result.title ?? result.notebookId, count: result.sourceCount ?? 0 })}
        </p>
      ) : null}

      <Field label={t("strategy")}>
        <Controller
          control={control}
          name="nbl.syncStrategy"
          render={({ field }) => (
            <ChoiceCardGroup columns={2} value={field.value} onValueChange={field.onChange} aria-label={t("strategy")}>
              {Object.values(SyncStrategy).map((s) => (
                <ChoiceCard key={s} value={s} title={t(`strategies.${s}.title`)} description={t(`strategies.${s}.description`)} />
              ))}
            </ChoiceCardGroup>
          )}
        />
      </Field>

      {strategy === "DRIVE_SYNC" ? (
        <>
          <Field label={t("driveFolder")} hint={t("driveFolderHint")} error={fieldError(formState.errors, "nbl.driveFolderId")}>
            <Input mono placeholder="1AbCdEf…" {...register("nbl.driveFolderId", { setValueAs: nullIfEmpty })} />
          </Field>
          <GoogleSignIn workspaceId={workspaceId} />
        </>
      ) : (
        <>
          <Field label={t("cookie")} hint={t("cookieHint")}>
            <SecretInput
              {...revealProps("NOTEBOOK_COOKIE")}
              placeholder="SID=…; HSID=…; SSID=…"
              value={secrets.NOTEBOOK_COOKIE ?? ""}
              onChange={(e) => onSecretsChange({ ...secrets, NOTEBOOK_COOKIE: e.target.value })}
            />
          </Field>
          <Field label={t("token")} hint={t("tokenHint")}>
            <SecretInput
              {...revealProps("NOTEBOOK_TOKEN")}
              placeholder="SNlM0e"
              value={secrets.NOTEBOOK_TOKEN ?? ""}
              onChange={(e) => onSecretsChange({ ...secrets, NOTEBOOK_TOKEN: e.target.value })}
            />
          </Field>
        </>
      )}

      <div className="flex flex-col gap-3">
        {(["autoSyncOnApprove", "confirmBeforeSync"] as const).map((name) => (
          <Controller
            key={name}
            control={control}
            name={`nbl.${name}`}
            render={({ field }) => (
              <Field layout="inline" label={t(`${name}.label`)} hint={t(`${name}.hint`)}>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </Field>
            )}
          />
        ))}
      </div>
    </>
  );
}
