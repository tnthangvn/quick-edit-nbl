"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
import type * as z from "zod";
import { getListConnectorsQueryKey, useCreateConnector, useUpdateConnector } from "@/client/api/generated";
import { ConnectorType, GitProvider, McpTransport, type Connector, type UpdateConnectorInput } from "@/client/api/generated/model";
import { CreateConnectorBody } from "@/client/api/generated/zod/connector/connector.zod";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { Field } from "@/ui/molecules/field";
import { LinesTextarea } from "@/ui/molecules/lines-textarea";
import { SecretInput } from "@/ui/molecules/secret-input";
import { Button } from "@/ui/primitives/button";
import { ChoiceCard, ChoiceCardGroup } from "@/ui/primitives/choice-card";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/primitives/dialog";
import { Input } from "@/ui/primitives/input";
import { Segmented, SegmentedItem } from "@/ui/primitives/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/primitives/select";
import { notify } from "@/ui/primitives/sonner";
import { apiErrorMap, applyServerFieldErrors, fieldError } from "@/ui/organisms/settings/form-errors";

/** Connector TOKEN phải có token khi tạo (schema API để optional vì dùng chung cho mọi loại). */
const FormSchema = CreateConnectorBody.superRefine((v, ctx) => {
  if (v.type === "TOKEN" && !v.token) ctx.addIssue({ code: "custom", path: ["token"], message: "FIELD.REQUIRED" });
});
type FormInput = z.input<typeof FormSchema>;

export type ConnectorDefaults = Partial<Pick<FormInput, "name" | "type" | "provider" | "host" | "command">>;

type ConnectorFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Có = sửa connector này (không đổi được loại). */
  connector?: Connector | null;
  defaults?: ConnectorDefaults;
  onSaved?: (connector: Connector) => void;
};

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

function toDefaults(connector: Connector | null | undefined, defaults: ConnectorDefaults | undefined): FormInput {
  if (connector) {
    return {
      name: connector.name,
      type: connector.type,
      provider: connector.provider,
      host: connector.host,
      command: connector.command,
      args: connector.args,
      env: connector.env,
      transport: connector.transport,
      url: connector.url,
      headers: connector.headers,
      secrets: {},
      agentTools: connector.agentTools,
    };
  }
  return {
    name: defaults?.name ?? "",
    type: defaults?.type ?? ConnectorType.CLI,
    provider: defaults?.provider ?? GitProvider.GITHUB,
    host: defaults?.host ?? null,
    command: defaults?.command ?? null,
    args: [],
    env: {},
    transport: McpTransport.STDIO,
    url: null,
    headers: {},
    secrets: {},
    agentTools: [],
  };
}

/** Thêm / sửa connector Git provider (spec 3.0.2): CLI có sẵn, MCP server (stdio / HTTP), Personal Access Token, SSH key. */
export function ConnectorFormDialog({ open, onOpenChange, ...props }: ConnectorFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" height="settings">
        {/* Nội dung chỉ mount khi mở → form nhận lại giá trị mặc định mỗi lần mở. */}
        <ConnectorForm onOpenChange={onOpenChange} {...props} />
      </DialogContent>
    </Dialog>
  );
}

function ConnectorForm({ onOpenChange, connector, defaults, onSaved }: Omit<ConnectorFormDialogProps, "open">) {
  const t = useTranslations("settings.connectorForm");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const editing = Boolean(connector);
  const form = useForm<FormInput>({ resolver: zodResolver(FormSchema, apiErrorMap), defaultValues: toDefaults(connector, defaults) });
  const { register, control, handleSubmit, setError, formState } = form;
  const type = useWatch({ control, name: "type" });
  const transport = useWatch({ control, name: "transport" });

  const done = (saved: Connector) => {
    void queryClient.invalidateQueries({ queryKey: getListConnectorsQueryKey() });
    notify.info(editing ? t("updated", { name: saved.name }) : t("created", { name: saved.name }));
    onSaved?.(saved);
    onOpenChange(false);
  };
  const fail = (err: unknown) => {
    if (!applyServerFieldErrors(err, setError)) notify.error(errorMessage(err));
  };
  const create = useCreateConnector({ mutation: { onSuccess: done, onError: fail } });
  const update = useUpdateConnector({ mutation: { onSuccess: done, onError: fail } });

  const submit = handleSubmit((raw) => {
    const data = FormSchema.parse(raw);
    if (connector) {
      const patch: UpdateConnectorInput = {
        name: data.name,
        provider: data.provider,
        host: data.host,
        command: data.command ?? undefined,
        args: data.args,
        env: data.env,
        transport: data.transport ?? undefined,
        url: data.url ?? undefined,
        headers: data.headers,
        secrets: Object.keys(data.secrets).length > 0 ? data.secrets : undefined,
        token: data.token,
      };
      update.mutate({ connectorId: connector.id, data: patch });
    } else {
      create.mutate({ data });
    }
  });

  const isMcp = type === "MCP";
  const isHttp = isMcp && transport === "HTTP";

  return (
        <form className="contents" noValidate onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{editing ? t("editTitle", { name: connector?.name ?? "" }) : t("createTitle")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label={t("type")}>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <ChoiceCardGroup columns={2} value={field.value} onValueChange={field.onChange} disabled={editing} aria-label={t("type")}>
                    {Object.values(ConnectorType).map((ct) => (
                      <ChoiceCard key={ct} value={ct} size="sm" title={t(`types.${ct}.title`)} description={t(`types.${ct}.description`)} />
                    ))}
                  </ChoiceCardGroup>
                )}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("name")} error={fieldError(formState.errors, "name")}>
                <Input placeholder={t("namePlaceholder")} {...register("name")} />
              </Field>
              <Field label={t("provider")} error={fieldError(formState.errors, "provider")}>
                <Controller
                  control={control}
                  name="provider"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(GitProvider).map((p) => (
                          <SelectItem key={p} value={p}>
                            {tc(`connector.provider.${p}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
            <Field label={t("host")} hint={t("hostHint")} error={fieldError(formState.errors, "host")}>
              <Input mono placeholder="github.com" {...register("host", { setValueAs: emptyToNull })} />
            </Field>

            {isMcp ? (
              <Field label={t("transport")}>
                <Controller
                  control={control}
                  name="transport"
                  render={({ field }) => (
                    <Segmented value={field.value ?? "STDIO"} onValueChange={field.onChange} aria-label={t("transport")}>
                      {Object.values(McpTransport).map((tr) => (
                        <SegmentedItem key={tr} value={tr}>
                          {t(`transports.${tr}`)}
                        </SegmentedItem>
                      ))}
                    </Segmented>
                  )}
                />
              </Field>
            ) : null}

            {type === "CLI" || (isMcp && !isHttp) ? (
              <Field
                label={isMcp ? t("mcpCommand") : t("cliCommand")}
                hint={isMcp ? t("mcpCommandHint") : t("cliCommandHint")}
                error={fieldError(formState.errors, "command")}
              >
                <Input mono placeholder={isMcp ? "npx" : "gh"} {...register("command", { setValueAs: emptyToNull })} />
              </Field>
            ) : null}

            {isMcp ? (
              <>
                {isHttp ? (
                  <>
                    <Field label={t("url")} error={fieldError(formState.errors, "url")}>
                      <Input mono placeholder="https://api.githubcopilot.com/mcp/" {...register("url", { setValueAs: emptyToNull })} />
                    </Field>
                    <Field label={t("headers")} hint={t("headersHint")} error={fieldError(formState.errors, "headers")}>
                      <Controller
                        control={control}
                        name="headers"
                        render={({ field }) => <LinesTextarea kind="record" sep=": " value={field.value} onChange={(v) => field.onChange(v)} placeholder="X-Team: specs" />}
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label={t("args")} hint={t("argsHint")} error={fieldError(formState.errors, "args")}>
                      <Controller
                        control={control}
                        name="args"
                        render={({ field }) => (
                          <LinesTextarea kind="list" value={field.value} onChange={(v) => field.onChange(v)} placeholder={"-y\n@modelcontextprotocol/server-github"} />
                        )}
                      />
                    </Field>
                    <Field label={t("env")} hint={t("envHint")} error={fieldError(formState.errors, "env")}>
                      <Controller
                        control={control}
                        name="env"
                        render={({ field }) => <LinesTextarea kind="record" value={field.value} onChange={(v) => field.onChange(v)} placeholder="GITHUB_HOST=github.com" />}
                      />
                    </Field>
                  </>
                )}
                <Field
                  label={t("secrets")}
                  hint={editing && connector?.secretKeys.length ? t("secretsHintSet", { keys: connector.secretKeys.join(", ") }) : t("secretsHint")}
                  error={fieldError(formState.errors, "secrets")}
                >
                  <Controller
                    control={control}
                    name="secrets"
                    render={({ field }) => (
                      <LinesTextarea kind="record" value={field.value} onChange={(v) => field.onChange(v)} placeholder="GITHUB_PERSONAL_ACCESS_TOKEN=ghp_…" />
                    )}
                  />
                </Field>
              </>
            ) : null}

            {type === "TOKEN" ? (
              <Field label={t("token")} hint={t("tokenHint")} error={fieldError(formState.errors, "token")}>
                <SecretInput isSet={connector?.hasToken} placeholder="ghp_…" {...register("token", { setValueAs: emptyToUndefined })} />
              </Field>
            ) : null}

            {type === "SSH" ? <p className="m-0 text-xs leading-4 text-muted-foreground">{t("sshHint")}</p> : null}
          </DialogBody>
          <DialogFooter className="justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={create.isPending || update.isPending}>
              {editing ? tc("actions.save") : t("create")}
            </Button>
          </DialogFooter>
        </form>
  );
}
