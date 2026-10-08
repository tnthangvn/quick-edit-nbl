"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CircleCheck, LogIn, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import {
  getListConnectorsQueryKey,
  useCreateConnector,
  useDetectConnectors,
  useListConnectorBranches,
  useListConnectorRepos,
  useListConnectors,
} from "@/client/api/generated";
import { GitProvider, PublishMode, type Connector, type DriveStorageConfig, type GitStorageInput } from "@/client/api/generated/model";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { useGoogleOAuth } from "@/client/hooks/use-google-oauth";
import { connectorStateVariants } from "@/ui/molecules/connector-row";
import { Field } from "@/ui/molecules/field";
import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import { ChoiceCard, ChoiceCardGroup } from "@/ui/primitives/choice-card";
import { Combobox } from "@/ui/primitives/combobox";
import { Icon } from "@/ui/primitives/icon";
import { Input } from "@/ui/primitives/input";
import { notify } from "@/ui/primitives/sonner";
import { Spinner } from "@/ui/primitives/spinner";
import { Switch } from "@/ui/primitives/switch";
import { Tabs, TabsList, TabsTrigger } from "@/ui/primitives/tabs";
import { ConnectorFormDialog } from "@/ui/organisms/connectors/ConnectorFormDialog";
import { canListRepos, DEFAULT_HOST, toRowState } from "@/ui/organisms/connectors/connector-utils";
import { fieldError } from "@/ui/organisms/settings/form-errors";

/**
 * Field nơi lưu dùng chung cho Wizard (body `createWorkspace`) và Settings › Workspace & Storage (body `updateWorkspaceConfig`):
 * hai form cùng đường dẫn `storage.git.*` / `storage.drive.*` nên chỉ cần một bộ field.
 */
type StorageForm = { storage: { git?: GitStorageInput | null; drive?: Partial<DriveStorageConfig> | null } };

const NO_CONNECTOR = "__none__";
const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/* ---------------------------------------------------------------- Kết nối qua */

function ConnectorPicker({ provider, value, onChange }: { provider: GitProvider; value: string | null; onChange: (id: string | null) => void }) {
  const t = useTranslations("wizard.git");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const list = useListConnectors();
  const detect = useDetectConnectors({ query: { staleTime: 5 * 60_000 } });
  const [formOpen, setFormOpen] = React.useState(false);
  const create = useCreateConnector({
    mutation: {
      onSuccess: (c) => {
        void queryClient.invalidateQueries({ queryKey: getListConnectorsQueryKey() });
        onChange(c.id);
      },
      onError: (err) => notify.error(errorMessage(err)),
    },
  });

  const connectors = (list.data?.items ?? []).filter((c) => c.provider === provider);
  const detected = (detect.data?.items ?? []).filter(
    (cli) => cli.provider === provider && cli.path && !connectors.some((c) => c.type === "CLI" && c.command === cli.command),
  );
  const selected = connectors.find((c) => c.id === value);

  const meta = (c: Connector) => {
    const state = toRowState(c.status);
    return (
      <>
        <Badge size="xs">{tc(`connector.type.${c.type}`)}</Badge>
        {c.account ? <code className="font-mono text-[11px] text-muted-foreground">{c.account}</code> : null}
        <span className={connectorStateVariants({ state })}>{tc(`connector.state.${state}`)}</span>
      </>
    );
  };

  return (
    <>
    <Field label={t("connectVia")} hint={t("connectViaHint")}>
      <div className="flex flex-col gap-2">
        {list.isPending ? (
          <span role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner size="sm" tone="muted" />
            {t("loadingConnectors")}
          </span>
        ) : (
          <ChoiceCardGroup value={value ?? NO_CONNECTOR} onValueChange={(v) => onChange(v === NO_CONNECTOR ? null : v)} aria-label={t("connectVia")}>
            {connectors.map((c) => (
              <ChoiceCard key={c.id} value={c.id} size="sm" title={c.name} description={c.host ?? c.url ?? c.command ?? undefined} meta={meta(c)} />
            ))}
            <ChoiceCard value={NO_CONNECTOR} size="sm" title={t("sshTitle")} description={t("sshDescription")} />
          </ChoiceCardGroup>
        )}
        {list.isError ? <p className="m-0 text-xs text-destructive">{errorMessage(list.error)}</p> : null}
        {selected && toRowState(selected.status) === "NEEDS_LOGIN" ? <p className="m-0 text-xs text-muted-foreground">{t("needsLogin")}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          {detected.map((cli) => (
            <Button
              key={cli.command}
              variant="tonal"
              size="sm"
              icon={Plus}
              loading={create.isPending && create.variables?.data.command === cli.command}
              onClick={() =>
                create.mutate({
                  data: { name: cli.account ? `${cli.command} · ${cli.account}` : cli.command, type: "CLI", provider, host: cli.host, command: cli.command },
                })
              }
            >
              {t("useDetected", { command: cli.command })}
            </Button>
          ))}
          <Button variant="ghost" size="sm" icon={Plus} onClick={() => setFormOpen(true)}>
            {t("addConnector")}
          </Button>
        </div>
      </div>
    </Field>
    <ConnectorFormDialog open={formOpen} onOpenChange={setFormOpen} defaults={{ provider }} onSaved={(c) => onChange(c.id)} />
    </>
  );
}

/* ---------------------------------------------------------------- Git */

export function GitStorageFields() {
  const t = useTranslations("wizard.git");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();
  const { control, register, setValue, formState } = useFormContext<StorageForm>();
  const provider = useWatch({ control, name: "storage.git.provider" }) ?? GitProvider.GITHUB;
  const connectorId = useWatch({ control, name: "storage.git.connectorId" }) ?? null;
  const repo = useWatch({ control, name: "storage.git.repo" }) ?? null;
  const publishMode = useWatch({ control, name: "storage.git.publishMode" }) ?? PublishMode.PUSH;
  const list = useListConnectors();
  const connector = list.data?.items.find((c) => c.id === connectorId) ?? null;
  const listable = canListRepos(connector);
  const repos = useListConnectorRepos(connectorId ?? "", undefined, { query: { enabled: Boolean(connectorId) && listable, staleTime: 60_000 } });
  const branches = useListConnectorBranches(connectorId ?? "", { repo: repo ?? "" }, { query: { enabled: Boolean(connectorId && repo && repo.length >= 3) && listable } });
  const err = (p: string) => fieldError(formState.errors, `storage.git.${p}`);
  const prDisabled = !connector || connector.type === "SSH" || provider === "GENERIC";

  React.useEffect(() => {
    if (prDisabled && publishMode === "PULL_REQUEST") setValue("storage.git.publishMode", "PUSH", { shouldDirty: true });
  }, [prDisabled, publishMode, setValue]);

  const repoOptions = (repos.data?.items ?? []).map((r) => ({
    value: r.fullName,
    hint: [r.private ? t("private") : t("public"), r.defaultBranch].filter(Boolean).join(" · "),
  }));
  const branchOptions = (branches.data?.items ?? []).map((b) => ({ value: b.name, hint: b.isDefault ? t("defaultBranch") : undefined }));
  const prName = provider === "GITLAB" ? t("mergeRequest") : t("pullRequest");

  return (
    <div className="flex flex-col gap-5">
      <Field label={t("provider")}>
        <Controller
          control={control}
          name="storage.git.provider"
          render={({ field }) => (
            <Tabs
              value={field.value ?? GitProvider.GITHUB}
              onValueChange={(v) => {
                field.onChange(v);
                setValue("storage.git.connectorId", null, { shouldDirty: true });
                setValue("storage.git.repo", null, { shouldDirty: true });
              }}
            >
              <TabsList variant="pill" aria-label={t("provider")} className="flex-wrap">
                {Object.values(GitProvider).map((p) => (
                  <TabsTrigger key={p} value={p}>
                    {tc(`connector.provider.${p}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        />
      </Field>

      <Field label={t("host")} hint={DEFAULT_HOST[provider] ? t("hostHintDefault", { host: DEFAULT_HOST[provider] }) : t("hostHint")} error={err("host")}>
        <Input mono placeholder={DEFAULT_HOST[provider] ?? "git.company.vn"} {...register("storage.git.host", { setValueAs: emptyToUndefined })} />
      </Field>

      {provider !== "GENERIC" ? (
        <Controller
          control={control}
          name="storage.git.connectorId"
          render={({ field }) => (
            <ConnectorPicker
              provider={provider}
              value={field.value ?? null}
              onChange={(id) => {
                field.onChange(id);
                setValue("storage.git.repo", null, { shouldDirty: true });
              }}
            />
          )}
        />
      ) : null}

      {connector && listable ? (
        <Field
          label={t("repo")}
          hint={repos.isError ? undefined : repos.isFetching ? t("loadingRepos") : t("repoHint", { source: connector.name })}
          error={err("repo") ?? (repos.isError ? errorMessage(repos.error) : null)}
        >
          <Controller
            control={control}
            name="storage.git.repo"
            render={({ field }) => (
              <Combobox
                mono
                allowCustom
                searchable
                placeholder="owner/repo"
                options={repoOptions}
                value={field.value ?? undefined}
                invalid={Boolean(err("repo"))}
                onChange={(v) => {
                  field.onChange(v);
                  const picked = repos.data?.items.find((r) => r.fullName === v);
                  if (picked?.defaultBranch) setValue("storage.git.branch", picked.defaultBranch, { shouldDirty: true });
                }}
              />
            )}
          />
        </Field>
      ) : (
        <Field label={t("remote")} hint={t("remoteHint")} error={err("remote")}>
          <Input mono placeholder="git@git.company.vn:team/specs.git" {...register("storage.git.remote", { setValueAs: emptyToUndefined })} />
        </Field>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("branch")} error={err("branch") ?? (branches.isError ? errorMessage(branches.error) : null)}>
          {connector && listable && repo ? (
            <Controller
              control={control}
              name="storage.git.branch"
              render={({ field }) => (
                <Combobox
                  mono
                  allowCustom
                  placeholder="main"
                  options={branchOptions}
                  value={field.value ?? undefined}
                  invalid={Boolean(err("branch"))}
                  onChange={field.onChange}
                />
              )}
            />
          ) : (
            <Input mono placeholder="main" {...register("storage.git.branch")} />
          )}
        </Field>
        <Field label={t("subdir")} hint={t("subdirHint")} error={err("subdir")}>
          <Input mono placeholder={t("subdirPlaceholder")} {...register("storage.git.subdir")} />
        </Field>
      </div>

      <Field label={t("publishMode")}>
        <Controller
          control={control}
          name="storage.git.publishMode"
          render={({ field }) => (
            <ChoiceCardGroup value={field.value ?? PublishMode.PUSH} onValueChange={field.onChange} aria-label={t("publishMode")}>
              <ChoiceCard value={PublishMode.PUSH} title={t("push")} description={t("pushDescription")} />
              <ChoiceCard
                value={PublishMode.PULL_REQUEST}
                disabled={prDisabled}
                title={t("pr", { name: prName })}
                description={prDisabled ? t("prDisabled") : t("prDescription")}
              />
            </ChoiceCardGroup>
          )}
        />
      </Field>
      {publishMode === "PULL_REQUEST" ? (
        <Field label={t("prBranchTemplate")} hint={t("prBranchTemplateHint")} error={err("prBranchTemplate")}>
          <Input mono {...register("storage.git.prBranchTemplate")} />
        </Field>
      ) : null}

      <Field label={t("commitMessage")} hint={t("commitMessageHint")} error={err("commitMessage")}>
        <Input mono {...register("storage.git.commitMessage")} />
      </Field>

      <div className="flex flex-col gap-3">
        {(["autoCommit", "autoPush", "pullOnOpen"] as const).map((name) => (
          <Controller
            key={name}
            control={control}
            name={`storage.git.${name}`}
            render={({ field }) => (
              <Field layout="inline" label={t(`${name}.label`)} hint={t(`${name}.hint`)}>
                <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
              </Field>
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Google */

/** Trạng thái + nút đăng nhập Google (OAuth popup), dùng chung cho Drive và NotebookLM Drive Sync. */
export function GoogleSignIn({ workspaceId }: { workspaceId?: string }) {
  const t = useTranslations("wizard.google");
  const errorMessage = useErrorMessage();
  const google = useGoogleOAuth(workspaceId);
  if (google.isLoading) {
    return (
      <span role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Spinner size="sm" tone="muted" />
        {t("checking")}
      </span>
    );
  }
  if (google.connected) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-primary">
        <Icon icon={CircleCheck} size="sm" />
        {t("connected")}
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" icon={LogIn} loading={google.connecting} loadingText={t("waiting")} disabled={!google.configured} onClick={() => void google.connect()}>
          {t("signIn")}
        </Button>
        <span className="text-xs text-muted-foreground">{google.configured ? t("notConnected") : t("notConfigured")}</span>
      </div>
      {google.error ? <p className="m-0 text-xs text-destructive">{errorMessage(google.error)}</p> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- Drive */

export function DriveStorageFields({ workspaceId }: { workspaceId?: string }) {
  const t = useTranslations("wizard.drive");
  const { control, register, formState } = useFormContext<StorageForm>();
  return (
    <div className="flex flex-col gap-5">
      <Field label={t("folder")} hint={t("folderHint")} error={fieldError(formState.errors, "storage.drive.folderId")}>
        <Input mono placeholder="https://drive.google.com/drive/folders/1AbC…" {...register("storage.drive.folderId")} />
      </Field>
      <Field label={t("auth")} hint={t("authHint")}>
        <div>
          <GoogleSignIn workspaceId={workspaceId} />
        </div>
      </Field>
      <div className="flex flex-col gap-3">
        {(["pullOnOpen", "pushOnApprove"] as const).map((name) => (
          <Controller
            key={name}
            control={control}
            name={`storage.drive.${name}`}
            render={({ field }) => (
              <Field layout="inline" label={t(`${name}.label`)} hint={t(`${name}.hint`)}>
                <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
              </Field>
            )}
          />
        ))}
      </div>
    </div>
  );
}
