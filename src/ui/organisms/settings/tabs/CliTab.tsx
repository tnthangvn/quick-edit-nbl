"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useDetectCliAgents } from "@/client/api/generated";
import { CliOutputFormat, type CliAgentDetection } from "@/client/api/generated/model";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { Field } from "@/ui/molecules/field";
import { LinesTextarea } from "@/ui/molecules/lines-textarea";
import { Badge } from "@/ui/primitives/badge";
import { Button, IconButton } from "@/ui/primitives/button";
import { ChoiceCard, ChoiceCardGroup } from "@/ui/primitives/choice-card";
import { Input } from "@/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/primitives/select";
import { Spinner } from "@/ui/primitives/spinner";
import { Switch } from "@/ui/primitives/switch";
import { fieldError } from "@/ui/organisms/settings/form-errors";
import type { SettingsForm } from "@/ui/organisms/settings/tabs/ApiTab";

function DetectMeta({ detection, loading }: { detection?: CliAgentDetection; loading: boolean }) {
  const t = useTranslations("settings.cli");
  if (loading) return <Spinner size="xs" tone="muted" />;
  if (!detection) return <span className="text-muted-foreground">{t("detect.custom")}</span>;
  if (!detection.found) {
    return (
      <>
        <Badge size="xs">{t("detect.notFound")}</Badge>
        {detection.installCommand ? <code className="truncate font-mono text-[11px] text-muted-foreground">{detection.installCommand}</code> : null}
      </>
    );
  }
  return (
    <>
      <Badge size="xs" variant="primary">
        {t("detect.found")}
      </Badge>
      {detection.version ? <code className="truncate font-mono text-[11px] text-muted-foreground">{detection.version}</code> : null}
      {detection.loginStatus === "LOGGED_OUT" ? <Badge size="xs" variant="outline">{t("detect.loggedOut")}</Badge> : null}
    </>
  );
}

/**
 * Tab 2 — CLI Agent Runner (spec 4): chọn profile dạng thẻ (kèm trạng thái tự dò `which <binary>` + lệnh cài gợi ý),
 * Binary Path, Default Arguments (mỗi dòng một arg), định dạng stdout, Workspace Path (chỉ đọc), Stream Stdout.
 */
export function CliTab({ workspacePath }: { workspacePath?: string }) {
  const t = useTranslations("settings.cli");
  const errorMessage = useErrorMessage();
  const { control, register, setValue, formState } = useFormContext<SettingsForm>();
  const profiles = useWatch({ control, name: "cli.profiles" }) ?? [];
  const activeId = useWatch({ control, name: "cli.activeProfileId" });
  const detect = useDetectCliAgents({ query: { staleTime: 5 * 60_000 } });
  const index = Math.max(
    0,
    profiles.findIndex((p) => p.id === activeId),
  );
  const active = profiles[index];
  const detection = detect.data?.items.find((d) => d.kind === active?.kind);

  return (
    <>
      <Field
        label={t("activeCli")}
        hint={detect.isError ? errorMessage(detect.error) : t("activeCliHint")}
        error={fieldError(formState.errors, "cli.activeProfileId")}
      >
        <div className="flex flex-col gap-2">
          <div className="flex justify-end">
            <IconButton icon={RefreshCw} size="icon-sm" label={t("detectAgain")} loading={detect.isFetching} onClick={() => void detect.refetch()} />
          </div>
          <Controller
            control={control}
            name="cli.activeProfileId"
            render={({ field }) => (
              <ChoiceCardGroup columns={2} value={field.value} onValueChange={field.onChange} aria-label={t("activeCli")}>
                {profiles.map((p) => (
                  <ChoiceCard
                    key={p.id}
                    value={p.id}
                    size="sm"
                    title={p.name}
                    description={t(`kinds.${p.kind}`)}
                    meta={<DetectMeta detection={detect.data?.items.find((d) => d.kind === p.kind)} loading={detect.isPending} />}
                  />
                ))}
              </ChoiceCardGroup>
            )}
          />
        </div>
      </Field>

      {active ? (
        <React.Fragment key={active.id}>
          <Field
            label={t("binaryPath")}
            hint={detection?.path && detection.path !== active.command ? undefined : t("binaryPathHint")}
            error={fieldError(formState.errors, `cli.profiles.${index}.command`)}
          >
            <Input mono {...register(`cli.profiles.${index}.command`)} />
          </Field>
          {detection?.path && detection.path !== active.command ? (
            <div className="-mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              {t("detectedAt")}
              <code className="font-mono text-[11px]">{detection.path}</code>
              <Button
                variant="link"
                size="sm"
                className="h-auto text-xs"
                onClick={() => setValue(`cli.profiles.${index}.command`, detection.path ?? active.command, { shouldDirty: true })}
              >
                {t("useDetected")}
              </Button>
            </div>
          ) : null}
          <Field label={t("args")} hint={t("argsHint")} error={fieldError(formState.errors, `cli.profiles.${index}.args`)}>
            <Controller
              control={control}
              name={`cli.profiles.${index}.args`}
              render={({ field }) => <LinesTextarea kind="list" rows={4} value={field.value} onChange={(v) => field.onChange(v)} />}
            />
          </Field>
          <Field label={t("outputFormat")} hint={t("outputFormatHint")}>
            <Controller
              control={control}
              name={`cli.profiles.${index}.outputFormat`}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger mono>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(CliOutputFormat).map((f) => (
                      <SelectItem key={f} value={f} mono>
                        {t(`formats.${f}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </React.Fragment>
      ) : null}

      <Field label={t("workspacePath")} hint={workspacePath ? t("workspacePathHint") : t("workspacePathNone")}>
        <Input mono readOnly value={workspacePath ?? ""} placeholder="—" />
      </Field>

      <Controller
        control={control}
        name="cli.streamStdout"
        render={({ field }) => (
          <Field layout="inline" label={t("streamStdout")} hint={t("streamStdoutHint")}>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </Field>
        )}
      />
    </>
  );
}
