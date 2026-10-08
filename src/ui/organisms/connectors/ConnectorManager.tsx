"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, CircleAlert, Plug, Plus, RefreshCw, Terminal } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  getListConnectorsQueryKey,
  getListConnectorToolsQueryKey,
  useCheckConnector,
  useCreateConnector,
  useDeleteConnector,
  useDetectConnectors,
  useListConnectors,
  useListConnectorTools,
  useUpdateConnector,
} from "@/client/api/generated";
import type { Connector, DetectedCli } from "@/client/api/generated/model";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { ConnectorRow } from "@/ui/molecules/connector-row";
import { EmptyState } from "@/ui/molecules/empty-state";
import { Badge } from "@/ui/primitives/badge";
import { Button, IconButton } from "@/ui/primitives/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/primitives/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/primitives/dialog";
import { Icon } from "@/ui/primitives/icon";
import { Label } from "@/ui/primitives/label";
import { notify } from "@/ui/primitives/sonner";
import { Spinner } from "@/ui/primitives/spinner";
import { Switch } from "@/ui/primitives/switch";
import { ConnectorFormDialog, type ConnectorDefaults } from "@/ui/organisms/connectors/ConnectorFormDialog";
import { toRowState } from "@/ui/organisms/connectors/connector-utils";

function SectionHeading({ title, description, action }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <h3 className="m-0 text-sm leading-5 font-semibold">{title}</h3>
        {description ? <p className="m-0 mt-0.5 text-xs leading-4 text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
      <Spinner size="sm" tone="muted" />
      {label}
    </div>
  );
}

/* ---------------------------------------------------------------- Tool MCP cấp cho Agent */

function McpTools({ connector }: { connector: Connector }) {
  const t = useTranslations("settings.integrations");
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const tools = useListConnectorTools(connector.id, { query: { enabled: open } });
  const update = useUpdateConnector({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListConnectorsQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getListConnectorToolsQueryKey(connector.id) });
      },
      onError: (err) => notify.error(errorMessage(err)),
    },
  });

  const toggle = (name: string, on: boolean) => {
    const next = on ? [...new Set([...connector.agentTools, name])] : connector.agentTools.filter((n) => n !== name);
    update.mutate({ connectorId: connector.id, data: { agentTools: next } });
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="-mt-1 ml-11">
      <CollapsibleTrigger asChild>
        <Button variant="text" size="sm" className="group/tools h-6 px-1 text-xs">
          {t("tools", { count: connector.agentTools.length })}
          <Icon icon={ChevronDown} size="xs" className="transition-transform duration-(--duration-base) group-data-[state=open]/tools:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 rounded-lg border border-border bg-card p-1">
        {tools.isPending ? (
          <Loading label={t("toolsLoading")} />
        ) : tools.isError ? (
          <p className="m-0 flex items-center gap-1 px-2 py-2 text-xs text-destructive">
            <Icon icon={CircleAlert} size="xs" />
            {errorMessage(tools.error)}
          </p>
        ) : tools.data.items.length === 0 ? (
          <p className="m-0 px-2 py-2 text-xs text-muted-foreground">{t("toolsEmpty")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {tools.data.items.map((tool) => {
              const id = `${connector.id}-${tool.name}`;
              const on = connector.agentTools.includes(tool.name);
              return (
                <li key={tool.name} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent">
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={id} className="font-mono text-xs">
                      {tool.name}
                    </Label>
                    {tool.description ? <p className="m-0 truncate text-[11px] leading-4 text-muted-foreground">{tool.description}</p> : null}
                  </div>
                  <Switch id={id} size="sm" checked={on} disabled={update.isPending} onCheckedChange={(v) => toggle(tool.name, v)} />
                </li>
              );
            })}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ---------------------------------------------------------------- Tự dò CLI */

function DetectedClis({ connectors, onAdd }: { connectors: Connector[]; onAdd: (defaults: ConnectorDefaults) => void }) {
  const t = useTranslations("settings.integrations");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const detect = useDetectConnectors();
  const create = useCreateConnector({
    mutation: {
      onSuccess: (c) => {
        void queryClient.invalidateQueries({ queryKey: getListConnectorsQueryKey() });
        notify.info(t("added", { name: c.name }));
      },
      onError: (err) => notify.error(errorMessage(err)),
    },
  });
  const quickAdd = (cli: DetectedCli) =>
    create.mutate({
      data: { name: cli.account ? `${cli.command} · ${cli.account}` : cli.command, type: "CLI", provider: cli.provider, host: cli.host, command: cli.command },
    });

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading
        title={t("detectTitle")}
        description={t("detectDescription")}
        action={<IconButton icon={RefreshCw} label={t("detectAgain")} loading={detect.isFetching} onClick={() => void detect.refetch()} />}
      />
      {detect.isPending ? (
        <Loading label={t("detecting")} />
      ) : detect.isError ? (
        <p className="m-0 text-xs text-destructive">{errorMessage(detect.error)}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {detect.data.items.map((cli) => {
            const added = connectors.some((c) => c.type === "CLI" && (c.command ?? "") === cli.command);
            return (
              <li key={cli.command} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                  <Icon icon={Terminal} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <code className="font-mono text-[13px] leading-[18px] font-medium">{cli.command}</code>
                    <span className="truncate text-xs text-muted-foreground">{tc(`connector.provider.${cli.provider}`)}</span>
                  </div>
                  <div className="truncate font-mono text-[11px] leading-4 text-muted-foreground">
                    {!cli.path
                      ? t("cliMissing")
                      : cli.loggedIn
                        ? [cli.version, cli.account && `${cli.account}@${cli.host ?? ""}`].filter(Boolean).join(" · ")
                        : t("cliLoggedOut", { command: cli.loginCommand })}
                  </div>
                </div>
                {!cli.path ? (
                  <Badge size="sm">{tc("connector.state.NOT_FOUND")}</Badge>
                ) : !cli.loggedIn ? (
                  <Badge size="sm" variant="outline">
                    {tc("connector.state.NEEDS_LOGIN")}
                  </Badge>
                ) : added ? (
                  <Badge size="sm" variant="primary">
                    {t("alreadyAdded")}
                  </Badge>
                ) : (
                  <Button variant="outline" size="sm" icon={Plus} loading={create.isPending && create.variables?.data.command === cli.command} onClick={() => quickAdd(cli)}>
                    {t("add")}
                  </Button>
                )}
                {cli.path && !cli.loggedIn ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAdd({ type: "CLI", provider: cli.provider, command: cli.command, name: cli.command })}
                  >
                    {t("addAnyway")}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- Danh sách connector */

/** Settings › Integrations (spec 3.0.2, Tab 5): connector Git provider, tự dò CLI, MCP server và tool cho Agent. */
export function ConnectorManager() {
  const t = useTranslations("settings.integrations");
  const tc = useTranslations("common.actions");
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const list = useListConnectors();
  const [form, setForm] = React.useState<{ open: boolean; connector?: Connector | null; defaults?: ConnectorDefaults }>({ open: false });
  const [removing, setRemoving] = React.useState<Connector | null>(null);
  const [testingId, setTestingId] = React.useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListConnectorsQueryKey() });
  const check = useCheckConnector({
    mutation: {
      onSuccess: (res) => {
        void invalidate();
        if (res.status === "CONNECTED") notify.info(t("checkOk"), { description: [res.account, res.host, res.scopes.join(", ")].filter(Boolean).join(" · ") });
        else if (res.status === "NEEDS_LOGIN") notify.warning(t("checkNeedsLogin"), { description: res.loginCommand ? t("runLogin", { command: res.loginCommand }) : undefined });
        else notify.error(t(`checkStatus.${res.status}`));
      },
      onError: (err) => notify.error(t("checkFailed"), { description: errorMessage(err) }),
      onSettled: () => setTestingId(null),
    },
  });
  const remove = useDeleteConnector({
    mutation: {
      onSuccess: () => {
        void invalidate();
        notify.info(t("removed", { name: removing?.name ?? "" }));
        setRemoving(null);
      },
      onError: (err) => notify.error(errorMessage(err)),
    },
  });

  const connectors = list.data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <SectionHeading
          title={t("connectorsTitle")}
          description={t("connectorsDescription")}
          action={
            <Button variant="outline" size="sm" icon={Plus} onClick={() => setForm({ open: true })}>
              {t("addConnector")}
            </Button>
          }
        />
        {list.isPending ? (
          <Loading label={t("loading")} />
        ) : list.isError ? (
          <EmptyState
            icon={CircleAlert}
            title={t("loadFailed")}
            description={errorMessage(list.error)}
            actions={
              <Button variant="outline" size="sm" onClick={() => void list.refetch()}>
                {tc("retry")}
              </Button>
            }
          />
        ) : connectors.length === 0 ? (
          <EmptyState icon={Plug} title={t("emptyTitle")} description={t("emptyDescription")} className="rounded-lg border border-dashed border-border" />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {connectors.map((c) => (
              <li key={c.id} className="flex flex-col gap-1">
                <ConnectorRow
                  name={c.name}
                  type={c.type}
                  provider={c.provider}
                  account={[c.account, c.host ?? c.url ?? c.command].filter(Boolean).join(" · ") || null}
                  state={toRowState(c.status)}
                  testing={testingId === c.id}
                  onTest={() => {
                    setTestingId(c.id);
                    check.mutate({ connectorId: c.id });
                  }}
                  onEdit={() => setForm({ open: true, connector: c })}
                  onDelete={() => setRemoving(c)}
                />
                {c.type === "MCP" ? <McpTools connector={c} /> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <DetectedClis connectors={connectors} onAdd={(defaults) => setForm({ open: true, defaults })} />

      <ConnectorFormDialog
        open={form.open}
        connector={form.connector}
        defaults={form.defaults}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
      />

      <Dialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t("removeTitle")}</DialogTitle>
            <DialogDescription>{t("removeDescription", { name: removing?.name ?? "" })}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="justify-end">
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              {tc("cancel")}
            </Button>
            <Button variant="destructive" loading={remove.isPending} onClick={() => removing && remove.mutate({ connectorId: removing.id })}>
              {tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
